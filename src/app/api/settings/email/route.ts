import { NextResponse } from "next/server"
import { z } from "zod"
import { db, tenants, tenantEmailConfig } from "@/lib/db"
import { eq } from "drizzle-orm"
import { driverFromConfig, mailboxSummary, platformDriver, verifySmtp } from "@/lib/mailer"
import { seal } from "@/lib/crypto"
import { ensureSchema } from "@/lib/db/ensure"
import { requireAccess } from "@/lib/tenant"
import { oauthConfigured, providerLabel, type OAuthProvider } from "@/lib/oauth"
import { capState, clampDailyCap, DEFAULT_DAILY_CAP, MAX_DAILY_CAP, MIN_DAILY_CAP, WARMUP_RAMP } from "@/lib/send-caps"
import type { DnsReport } from "@/lib/dns-check"

export const runtime = "nodejs"

export type EmailSettings = {
  connected: boolean
  kind: "google" | "microsoft" | "smtp" | "none"
  address: string | null
  platformFallback: boolean
  host: string | null
  port: number | null
  username: string | null
  verified: boolean
  connectedAt: string | null
  bodyStyle: "plain" | "card"
  caps: {
    dailyCap: number
    effectiveCap: number
    warmupCap: number | null
    warmupDay: number | null
    sentToday: number
    remaining: number
    min: number
    max: number
    ramp: { throughDay: number; cap: number }[]
  }
  providers: { id: OAuthProvider; label: string; available: boolean }[]
  dns: (DnsReport & { stale: boolean }) | null
}

/** Current mailbox status. Never returns a password or a refresh token. */
export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()

  const cfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, gate.tenant.id) })
  const own = driverFromConfig(cfg)
  const summary = mailboxSummary(cfg)
  const caps = await capState({ tenantId: gate.tenant.id, dailyCap: cfg?.dailyCap, warmupStartedAt: cfg?.warmupStartedAt })
  const report = (cfg?.dnsDetail as DnsReport | null) ?? null

  const body: EmailSettings = {
    connected: !!own,
    kind: summary.kind,
    address: summary.address,
    platformFallback: !own && !!platformDriver(),
    host: cfg?.smtpHost ?? null,
    port: cfg?.smtpPort ?? null,
    username: cfg?.smtpUsername ?? null,
    verified: cfg?.isVerified ?? false,
    connectedAt: cfg?.oauthConnectedAt?.toISOString() ?? null,
    bodyStyle: cfg?.bodyStyle === "card" ? "card" : "plain",
    caps: { ...caps, min: MIN_DAILY_CAP, max: MAX_DAILY_CAP, ramp: WARMUP_RAMP },
    providers: (["google", "microsoft"] as OAuthProvider[]).map((id) => ({
      id, label: providerLabel(id), available: oauthConfigured(id),
    })),
    dns: report
      ? { ...report, stale: !cfg?.dnsCheckedAt || Date.now() - cfg.dnsCheckedAt.getTime() > 7 * 86_400_000 }
      : null,
  }
  return NextResponse.json(body)
}

const SmtpBody = z.object({
  host: z.string().trim().min(1).max(253).regex(/^[a-z0-9.-]+$/i, "That does not look like a mail server."),
  port: z.number().int().min(1).max(65535),
  username: z.string().trim().min(3).max(320),
  password: z.string().min(1).max(512),
})

/** Save SMTP credentials after verifying them against the server. */
export async function POST(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  try {
    await ensureSchema()
    const parsed = SmtpBody.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Host, port, username and password are all required, and the host must be a hostname." }, { status: 400 })
    }
    const { host, port, username, password } = parsed.data

    const err = await verifySmtp({ host, port, user: username, pass: password })
    if (err) return NextResponse.json({ error: `Could not sign in to that mailbox: ${err}` }, { status: 400 })

    const existing = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, gate.tenant.id) })
    const values = {
      provider: "smtp", smtpHost: host, smtpPort: port, smtpUsername: username,
      smtpPasswordEncrypted: seal(password), apiKeyEncrypted: null, isVerified: true,
      // Swapping to SMTP drops the OAuth grant rather than leaving a live token behind.
      oauthRefreshTokenEncrypted: null, oauthEmail: null, oauthScope: null, oauthConnectedAt: null,
      warmupStartedAt: existing?.warmupStartedAt ?? new Date(),
      updatedAt: new Date(),
    }
    if (existing) await db.update(tenantEmailConfig).set(values).where(eq(tenantEmailConfig.tenantId, gate.tenant.id))
    else await db.insert(tenantEmailConfig).values({ tenantId: gate.tenant.id, dailyCap: DEFAULT_DAILY_CAP, ...values })

    // The rep's mailbox is the sender: default the tenant's from-address to it when none is set.
    if ((!gate.tenant.fromEmail || gate.tenant.fromEmail.endsWith("@example.com")) && username.includes("@")) {
      await db.update(tenants).set({ fromEmail: username }).where(eq(tenants.id, gate.tenant.id))
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

const PatchBody = z.object({
  dailyCap: z.number().int().optional(),
  bodyStyle: z.enum(["plain", "card"]).optional(),
})

/** Change the guardrails without touching the connection. */
export async function PATCH(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const parsed = PatchBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })
  await ensureSchema()

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.dailyCap !== undefined) patch.dailyCap = clampDailyCap(parsed.data.dailyCap)
  if (parsed.data.bodyStyle !== undefined) patch.bodyStyle = parsed.data.bodyStyle
  if (Object.keys(patch).length === 1) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })

  const existing = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, gate.tenant.id) })
  if (existing) await db.update(tenantEmailConfig).set(patch).where(eq(tenantEmailConfig.tenantId, gate.tenant.id))
  else await db.insert(tenantEmailConfig).values({ tenantId: gate.tenant.id, provider: "smtp", ...patch })
  return NextResponse.json({ ok: true })
}

/** Disconnect the mailbox. */
export async function DELETE() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await db.delete(tenantEmailConfig).where(eq(tenantEmailConfig.tenantId, gate.tenant.id))
  return NextResponse.json({ ok: true })
}
