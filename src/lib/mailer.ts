/**
 * Outbound email, behind one interface.
 *
 * Resolution order for a tenant:
 *   1. The tenant's own SMTP mailbox (tenant_email_config.provider = "smtp") —
 *      Google Workspace, Microsoft 365, Zoho, anything. Mail leaves from the rep's
 *      real address, which is what the recipient expects from a personal note.
 *   2. The platform mailbox, when SMTP_URL is set on the deployment
 *      (smtp://user:pass@host:port). This is the fallback for trials that have not
 *      connected a mailbox yet.
 *   3. No driver: the send is refused with a clear message and the scheduled send
 *      is marked failed, never silently "sent".
 *
 * To add a vendor later (SES, Postmark, SendGrid…) implement `MailDriver` and
 * return it from `resolveDriver`. Nothing else in the app knows how mail moves.
 */
import nodemailer from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import { db, tenantEmailConfig } from "@/lib/db"
import { eq } from "drizzle-orm"

export type MailMessage = {
  from: string
  to: string
  subject: string
  html: string
  text?: string
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

export function driverFromConfig(cfg: TenantEmailConfigRow | null | undefined): MailDriver | null {
  if (cfg?.provider === "smtp" && cfg.smtpHost && cfg.smtpUsername && cfg.smtpPasswordEncrypted) {
    const port = cfg.smtpPort ?? 587
    return smtpDriver({
      host: cfg.smtpHost, port, secure: port === 465,
      auth: { user: cfg.smtpUsername, pass: cfg.smtpPasswordEncrypted },
    }, "tenant-smtp")
  }
  return null
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
