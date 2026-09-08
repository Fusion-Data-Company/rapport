/**
 * SPF / DKIM / DMARC check for the sending domain.
 *
 * Rapport sends from the agent's own mailbox, so its deliverability is the domain's
 * deliverability. This reads the public DNS records and says, in plain words, which
 * of the three is missing and what to add. It never changes anything.
 */
import { Resolver } from "node:dns/promises"

export type CheckStatus = "pass" | "warn" | "fail"

export type RecordCheck = {
  status: CheckStatus
  /** One sentence the agent can act on. */
  detail: string
  /** The record that was found, when there was one. */
  found?: string
}

export type DnsReport = {
  domain: string
  checkedAt: string
  spf: RecordCheck
  dkim: RecordCheck
  dmarc: RecordCheck
}

/** DKIM selectors the two big providers publish under, plus the common generic ones. */
const DKIM_SELECTORS: Record<string, string[]> = {
  google: ["google"],
  microsoft: ["selector1", "selector2"],
  smtp: ["google", "selector1", "selector2", "default", "mail", "dkim", "k1", "s1"],
}

export function domainOf(address: string | null | undefined): string | null {
  if (!address || !address.includes("@")) return null
  const d = address.split("@").pop()?.trim().toLowerCase()
  return d && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) ? d : null
}

function resolver(): Resolver {
  const r = new Resolver({ timeout: 4000, tries: 2 })
  // Public resolvers: the deployment's own resolver may not answer for arbitrary domains.
  r.setServers(["1.1.1.1", "8.8.8.8"])
  return r
}

async function txt(r: Resolver, name: string): Promise<string[]> {
  try {
    const records = await r.resolveTxt(name)
    return records.map((chunks) => chunks.join(""))
  } catch {
    return []
  }
}

async function checkSpf(r: Resolver, domain: string): Promise<RecordCheck> {
  const records = (await txt(r, domain)).filter((v) => v.toLowerCase().startsWith("v=spf1"))
  if (records.length === 0) {
    return { status: "fail", detail: `No SPF record on ${domain}. Add a TXT record starting "v=spf1" that authorises your mail provider, or notes from this domain will be treated as suspicious.` }
  }
  if (records.length > 1) {
    return { status: "fail", found: records[0], detail: `${domain} has ${records.length} SPF records. A domain may have exactly one; receivers fail all of them when there is more than one.` }
  }
  const record = records[0]
  if (/[?~+]all\s*$/.test(record.trim()) === false && /-all\s*$/.test(record.trim()) === false) {
    return { status: "warn", found: record, detail: "SPF record found, but it does not end in an -all or ~all policy, so receivers get no instruction about unlisted senders." }
  }
  if (/\+all\s*$/.test(record.trim())) {
    return { status: "warn", found: record, detail: 'SPF ends in "+all", which authorises the entire internet to send as your domain. Change it to "~all" or "-all".' }
  }
  return { status: "pass", found: record, detail: "SPF is published and ends in a policy receivers can act on." }
}

async function checkDkim(r: Resolver, domain: string, provider: string): Promise<RecordCheck> {
  const selectors = DKIM_SELECTORS[provider] ?? DKIM_SELECTORS.smtp
  for (const selector of selectors) {
    const records = await txt(r, `${selector}._domainkey.${domain}`)
    const key = records.find((v) => v.toLowerCase().includes("p="))
    if (key) {
      return { status: "pass", found: `${selector}._domainkey`, detail: `DKIM is published under the "${selector}" selector, so your notes are signed.` }
    }
  }
  return {
    status: "fail",
    detail: provider === "google"
      ? `No DKIM key found on ${domain}. Turn on DKIM in the Google Admin console (Apps, Google Workspace, Gmail, Authenticate email) and publish the TXT record it gives you.`
      : provider === "microsoft"
        ? `No DKIM key found on ${domain}. Enable DKIM in the Microsoft 365 Defender portal and publish the two CNAME records it gives you.`
        : `No DKIM key found on ${domain} under the usual selectors. Ask your mail provider which selector they sign with and publish it.`,
  }
}

async function checkDmarc(r: Resolver, domain: string): Promise<RecordCheck> {
  const records = (await txt(r, `_dmarc.${domain}`)).filter((v) => v.toLowerCase().startsWith("v=dmarc1"))
  if (records.length === 0) {
    return { status: "warn", detail: `No DMARC record on ${domain}. Gmail and Yahoo now expect one even from small senders. Start with "v=DMARC1; p=none; rua=mailto:you@${domain}".` }
  }
  const record = records[0]
  const policy = /p=\s*(none|quarantine|reject)/i.exec(record)?.[1]?.toLowerCase()
  if (policy === "none") {
    return { status: "pass", found: record, detail: 'DMARC is published at p=none, which satisfies the bulk-sender requirements. Move to p=quarantine once the reports look clean.' }
  }
  return { status: "pass", found: record, detail: `DMARC is published at p=${policy ?? "unknown"}.` }
}

/** Reads the three records. Never throws: a lookup that fails comes back as a warn. */
export async function checkDomain(address: string | null | undefined, provider: string): Promise<DnsReport | null> {
  const domain = domainOf(address)
  if (!domain) return null
  const r = resolver()
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(r, domain).catch((): RecordCheck => ({ status: "warn", detail: "The SPF lookup did not answer. Try again in a moment." })),
    checkDkim(r, domain, provider).catch((): RecordCheck => ({ status: "warn", detail: "The DKIM lookup did not answer. Try again in a moment." })),
    checkDmarc(r, domain).catch((): RecordCheck => ({ status: "warn", detail: "The DMARC lookup did not answer. Try again in a moment." })),
  ])
  return { domain, checkedAt: new Date().toISOString(), spf, dkim, dmarc }
}
