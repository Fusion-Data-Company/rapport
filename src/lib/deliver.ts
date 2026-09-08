/**
 * One place that actually puts a note in the world.
 *
 * The morning cron and the approve button on the schedule both come through here,
 * so the send cap, the plain-text body, the unsubscribe header, the send log and
 * the timeline entry are identical whichever way a note goes out.
 */
import { db, cardTemplates, contacts, scheduledSends, sendLog, tenantEmailConfig, tenants } from "@/lib/db"
import { and, eq, isNull, or } from "drizzle-orm"
import { sendMail } from "@/lib/mailer"
import { unsubscribeUrl } from "@/lib/unsubscribe"
import { buildNote, type BodyStyle } from "@/lib/email-body"
import { capState } from "@/lib/send-caps"
import { recordTimeline } from "@/lib/timeline"

export type TenantRow = typeof tenants.$inferSelect
export type ContactRow = typeof contacts.$inferSelect

/** The tenant's own card for the occasion, else a system card; never another tenant's. */
export async function cardFor(tenantId: string, occasion: string) {
  return db.query.cardTemplates.findFirst({
    where: and(
      eq(cardTemplates.occasionType, occasion),
      eq(cardTemplates.isActive, true),
      or(eq(cardTemplates.tenantId, tenantId), isNull(cardTemplates.tenantId)),
    ),
    orderBy: (c, { desc }) => [desc(c.tenantId)],
  })
}

export async function bodyStyleFor(tenantId: string): Promise<BodyStyle> {
  const cfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, tenantId) })
  return cfg?.bodyStyle === "card" ? "card" : "plain"
}

export async function remainingToday(tenantId: string): Promise<number> {
  const cfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, tenantId) })
  const caps = await capState({ tenantId, dailyCap: cfg?.dailyCap, warmupStartedAt: cfg?.warmupStartedAt })
  return caps.remaining
}

/** Send one written note and record everything that follows from it. */
export async function deliver({ sendId, tenant, contact, subject, body, cardUrl, style }: {
  sendId: string
  tenant: TenantRow
  contact: ContactRow
  subject: string
  body: string
  cardUrl?: string | null
  style: BodyStyle
}) {
  const unsubUrl = unsubscribeUrl(contact.id)
  const note = buildNote({
    body, cardUrl, style,
    businessName: tenant.businessName,
    fromName: tenant.fromName,
    unsubscribeUrl: unsubUrl,
    postalAddress: tenant.postalAddress ?? null,
  })
  const result = await sendMail(tenant.id, {
    from: `${tenant.fromName} <${tenant.fromEmail}>`,
    to: contact.email as string,
    subject, text: note.text, html: note.html, unsubscribeUrl: unsubUrl,
  })
  await db.update(scheduledSends)
    .set({ status: "sent", emailSubject: subject, emailBodyText: body, emailBodyHtml: note.html, sentAt: new Date(), errorMessage: null })
    .where(eq(scheduledSends.id, sendId))
  await db.insert(sendLog).values({
    tenantId: tenant.id, contactId: contact.id, scheduledSendId: sendId, eventType: "sent",
    metadata: { providerMessageId: result?.id ?? null },
  }).catch(() => undefined)
  // The note becomes history, so tomorrow's note knows what today's said.
  await recordTimeline({
    tenantId: tenant.id, contactId: contact.id, kind: "sent",
    summary: subject, body, source: "rapport", scheduledSendId: sendId,
  })
}

export type SendOutcome = "sent" | "deferred" | "skipped" | "failed"

/**
 * Deliver a row that is already written. Returns what happened rather than throwing,
 * so a batch can report per-note outcomes.
 */
export async function deliverWrittenRow(opts: {
  send: typeof scheduledSends.$inferSelect
  tenant: TenantRow
  style: BodyStyle
  budget: number
}): Promise<{ outcome: SendOutcome; error?: string }> {
  const { send, tenant, style, budget } = opts
  const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, send.contactId) })
  if (!contact?.email) {
    await db.update(scheduledSends).set({ status: "skipped", errorMessage: "No contact address" }).where(eq(scheduledSends.id, send.id))
    return { outcome: "skipped", error: "No contact address" }
  }
  if (contact.unsubscribed || contact.status !== "active") {
    await db.update(scheduledSends).set({ status: "skipped", errorMessage: "Contact unsubscribed" }).where(eq(scheduledSends.id, send.id))
    return { outcome: "skipped", error: "Contact unsubscribed" }
  }
  if (budget <= 0) {
    await db.update(scheduledSends)
      .set({ status: "deferred", errorMessage: "Held back by today's mailbox send cap; goes out on the next run." })
      .where(eq(scheduledSends.id, send.id))
    return { outcome: "deferred" }
  }
  try {
    const card = send.cardTemplateId
      ? await db.query.cardTemplates.findFirst({ where: eq(cardTemplates.id, send.cardTemplateId) })
      : await cardFor(tenant.id, send.occasionType)
    await deliver({
      sendId: send.id, tenant, contact,
      subject: send.emailSubject ?? "Thinking of you",
      body: send.emailBodyText ?? "",
      cardUrl: card?.imageUrl, style,
    })
    return { outcome: "sent" }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await db.update(scheduledSends).set({ status: "failed", errorMessage: error.slice(0, 500) }).where(eq(scheduledSends.id, send.id))
    return { outcome: "failed", error }
  }
}
