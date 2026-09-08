/**
 * Outbound email, behind one interface.
 *
 * Resolution order for a tenant:
 *   1. The tenant's OAuth mailbox (provider "google" or "microsoft"). Mail is handed
 *      to the Gmail API or Microsoft Graph on the rep's own send-only grant, so it
 *      lands in the recipient's inbox as a normal message from a real person and
 *      shows up in the rep's own Sent folder. No app passwords anywhere.
 *   2. The tenant's own SMTP mailbox (provider "smtp") - Zoho, a host's mail server,
 *      anything the two OAuth providers do not cover.
 *   3. The platform mailbox, when SMTP_URL is set on the deployment
 *      (smtp://user:pass@host:port). This is the fallback for trials that have not
 *      connected a mailbox yet.
 *   4. No driver: the send is refused with a clear message and the scheduled send
 *      is marked failed, never silently "sent".
 *
 * To add a vendor later implement `MailDriver` and return it from `resolveDriver`.
 * Nothing else in the app knows how mail moves.
 */
import nodemailer from "nodemailer"
import MailComposer from "nodemailer/lib/mail-composer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import { db, tenantEmailConfig } from "@/lib/db"
import { eq } from "drizzle-orm"
import { open } from "@/lib/crypto"
import { refreshAccessToken, type OAuthProvider } from "@/lib/oauth"

export type MailMessage = {
  from: string
  to: string
  subject: string
  /** Optional: a plain-text-only note is the default, because that is what a real person sends. */
  html?: string
  text: string
  unsubscribeUrl?: string
}

export interface MailDriver {
  readonly name: string
  send(msg: MailMessage): Promise<{ id?: string }>
}

export class NoMailerError extends Error {
  constructor() {
    super("No email provider is connected. Open Settings → Email Provider and connect a mailbox before sends can go out.")
    this.name = "NoMailerError"
  }
}

function headersFor(msg: MailMessage) {
  return msg.unsubscribeUrl
    ? { "List-Unsubscribe": `<${msg.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
    : undefined
}

export function smtpDriver(opts: SMTPTransport.Options | string, name = "smtp"): MailDriver {
  const transport = nodemailer.createTransport(opts as SMTPTransport.Options)
  return {
    name,
    async send(msg) {
      const info = await transport.sendMail({
        from: msg.from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, headers: headersFor(msg),
      })
      return { id: info.messageId }
    },
  }
}

/** Driver used when nothing is configured: logs and refuses. */
export const noopDriver: MailDriver = {
  name: "none",
  async send(msg) {
    console.warn(`[mailer] no provider configured; refusing send to ${msg.to} (${msg.subject})`)
    throw new NoMailerError()
  },
}

export type TenantEmailConfigRow = typeof tenantEmailConfig.$inferSelect

/** RFC 822 bytes for a message, built once and handed to whichever API wants them. */
async function rawMessage(msg: MailMessage): Promise<Buffer> {
  return new MailComposer({
    from: msg.from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    ...(msg.html ? { html: msg.html } : {}),
    headers: headersFor(msg),
  }).compile().build()
}

/** Gmail API. Scope is gmail.send: Rapport can send as the user and can read nothing. */
export function gmailDriver(refreshToken: string): MailDriver {
  return {
    name: "gmail-oauth",
    async send(msg) {
      const { accessToken } = await refreshAccessToken("google", refreshToken)
      const raw = (await rawMessage(msg)).toString("base64url")
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      })
      if (!res.ok) throw new Error(`Gmail refused the send (${res.status}): ${(await res.text()).slice(0, 300)}`)
      const json = (await res.json()) as { id?: string }
      return { id: json.id }
    },
  }
}

/** Microsoft Graph sendMail. Scope is Mail.Send; the note lands in the user's Sent Items. */
export function microsoftDriver(refreshToken: string): MailDriver {
  return {
    name: "microsoft-oauth",
    async send(msg) {
      const { accessToken } = await refreshAccessToken("microsoft", refreshToken)
      const raw = (await rawMessage(msg)).toString("base64")
      // Graph accepts a MIME message directly, which keeps the List-Unsubscribe
      // headers and the exact body we built for every other driver.
      const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "text/plain" },
        body: raw,
      })
      if (!res.ok) throw new Error(`Microsoft refused the send (${res.status}): ${(await res.text()).slice(0, 300)}`)
      return {}
    },
  }
}

export function oauthDriverFromConfig(cfg: TenantEmailConfigRow | null | undefined): MailDriver | null {
  if (!cfg?.oauthRefreshTokenEncrypted) return null
  const provider = cfg.provider as OAuthProvider
  if (provider !== "google" && provider !== "microsoft") return null
  const token = open(cfg.oauthRefreshTokenEncrypted)
  if (!token) return null
  return provider === "google" ? gmailDriver(token) : microsoftDriver(token)
}

export function driverFromConfig(cfg: TenantEmailConfigRow | null | undefined): MailDriver | null {
  const oauth = oauthDriverFromConfig(cfg)
  if (oauth) return oauth
  if (cfg?.provider === "smtp" && cfg.smtpHost && cfg.smtpUsername && cfg.smtpPasswordEncrypted) {
    const port = cfg.smtpPort ?? 587
    return smtpDriver({
      host: cfg.smtpHost, port, secure: port === 465,
      auth: { user: cfg.smtpUsername, pass: open(cfg.smtpPasswordEncrypted) ?? "" },
    }, "tenant-smtp")
  }
  return null
}

/** How the connected mailbox is described in the UI and the send log. */
export function mailboxSummary(cfg: TenantEmailConfigRow | null | undefined): {
  kind: "google" | "microsoft" | "smtp" | "none"
  address: string | null
} {
  if (cfg?.oauthRefreshTokenEncrypted && (cfg.provider === "google" || cfg.provider === "microsoft")) {
    return { kind: cfg.provider, address: cfg.oauthEmail ?? null }
  }
  if (cfg?.provider === "smtp" && cfg.smtpHost && cfg.smtpUsername && cfg.smtpPasswordEncrypted) {
    return { kind: "smtp", address: cfg.smtpUsername }
  }
  return { kind: "none", address: null }
}

export function platformDriver(): MailDriver | null {
  const url = process.env.SMTP_URL
  return url ? smtpDriver(url, "platform-smtp") : null
}

export async function resolveDriver(tenantId: string): Promise<MailDriver> {
  const cfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, tenantId) })
  return driverFromConfig(cfg) ?? platformDriver() ?? noopDriver
}

/** Send one message for a tenant. Throws NoMailerError when no provider exists. */
export async function sendMail(tenantId: string, msg: MailMessage) {
  const driver = await resolveDriver(tenantId)
  return driver.send(msg)
}

/** Try the SMTP credentials without saving them. Returns null on success, else the error text. */
export async function verifySmtp(opts: { host: string; port: number; user: string; pass: string }): Promise<string | null> {
  try {
    const t = nodemailer.createTransport({ host: opts.host, port: opts.port, secure: opts.port === 465, auth: { user: opts.user, pass: opts.pass } })
    await t.verify()
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}
