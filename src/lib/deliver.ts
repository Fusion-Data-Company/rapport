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
import { dispatch, type NotePayload, type WebhookEvent } from "@/lib/webhooks"
import { occasionLine, resolveCard, type ResolvedCard } from "@/lib/card-image"

export type TenantRow = typeof tenants.$inferSelect
export type ContactRow = typeof contacts.$inferSelect
export type SendRow = typeof scheduledSends.$inferSelect

/** The webhook body for one note. Flat keys, so a Zapier Catch Hook maps it with no code step. */
export function notePayload(opts: {
  event: WebhookEvent
  tenant: TenantRow
  contact: ContactRow
  sendId: string
  occasionType: string
  occasionLabel: string
  scheduledDate: string
  subject?: string | null
  body?: string | null
  sentAt?: Date | null
  error?: string | null
}): NotePayload {
  return {
    event: opts.event,
    id: opts.sendId,
    created_at: new Date().toISOString(),
    tenant_id: opts.tenant.id,
    business_name: opts.tenant.businessName,
    contact_id: opts.contact.id,
    contact_first_name: opts.contact.firstName,
    contact_last_name: opts.contact.lastName,
    contact_email: opts.contact.email,
    contact_company: opts.contact.companyName,
    contact_tier: opts.contact.tier,
    occasion: opts.occasionType,
    occasion_label: opts.occasionLabel,
    subject: opts.subject ?? null,
    body: opts.body ?? null,
    scheduled_date: opts.scheduledDate,
    sent_at: opts.sentAt?.toISOString() ?? null,
    error: opts.error ?? null,
  }
}

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

/**
 * The card for one note, with this contact's name on it.
 *
 * Generation first when a provider is configured; the occasion's system card when it
 * is not, or when generation fails. The result is never null-and-nothing: an agent
 * who has not connected anything still sends a card with a name on it.
 */
export async function cardForNote(opts: {
  tenantId: string
  occasion: string
  /** The name printed on the card. A child's name for a child's birthday. */
  name: string
  senderLine?: string | null
  timeoutMs?: number
}): Promise<ResolvedCard> {
  const fallback = await cardFor(opts.tenantId, opts.occasion)
  return resolveCard({
    occasion: opts.occasion,
    name: opts.name,
    senderLine: opts.senderLine,
    timeoutMs: opts.timeoutMs,
    fallback: fallback
      ? { id: fallback.id, imageUrl: fallback.imageUrl, thumbnailUrl: fallback.thumbnailUrl, tenantId: fallback.tenantId }
      : null,
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
export async function deliver({ sendId, tenant, contact, subject, body, cardUrl, cardAlt, style, occasionType, occasionLabel, scheduledDate }: {
  sendId: string
  tenant: TenantRow
  contact: ContactRow
  subject: string
  body: string
  cardUrl?: string | null
  /** What the card says. Becomes the image alt so the line survives images-off. */
  cardAlt?: string | null
  style: BodyStyle
  occasionType: string
  occasionLabel: string
  scheduledDate: string
}) {
  const unsubUrl = unsubscribeUrl(contact.id)
  const note = buildNote({
    body, cardUrl, style,
    cardAlt: cardAlt ?? occasionLine(occasionType, contact.nickname?.trim() || contact.firstName),
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
  // Out to whatever the agent has hung off this. After the send is already recorded,
  // so a slow or broken receiver can never turn a delivered note into a failed one.
  await dispatch(tenant.id, "note.sent", notePayload({
    event: "note.sent", tenant, contact, sendId,
    occasionType, occasionLabel, scheduledDate,
    subject, body, sentAt: new Date(),
  }))
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
    await dispatch(tenant.id, "note.skipped", notePayload({
      event: "note.skipped", tenant, contact, sendId: send.id,
      occasionType: send.occasionType, occasionLabel: send.occasionLabel, scheduledDate: send.scheduledDate,
      subject: send.emailSubject, body: send.emailBodyText, error: "Contact unsubscribed",
    }))
    return { outcome: "skipped", error: "Contact unsubscribed" }
  }
  if (budget <= 0) {
    await db.update(scheduledSends)
      .set({ status: "deferred", errorMessage: "Held back by today's mailbox send cap; goes out on the next run." })
      .where(eq(scheduledSends.id, send.id))
    return { outcome: "deferred" }
  }
  try {
    // The card this row was queued with. Only when a row predates the card columns
    // is the template looked up again.
    let cardUrl = send.cardImageUrl
    if (!cardUrl) {
      const card = send.cardTemplateId
        ? await db.query.cardTemplates.findFirst({ where: eq(cardTemplates.id, send.cardTemplateId) })
        : await cardFor(tenant.id, send.occasionType)
      cardUrl = card?.imageUrl ?? null
    }
    await deliver({
      sendId: send.id, tenant, contact,
      subject: send.emailSubject ?? "Thinking of you",
      body: send.emailBodyText ?? "",
      cardUrl, style,
      cardAlt: occasionLine(send.occasionType, contact.nickname?.trim() || contact.firstName),
      occasionType: send.occasionType, occasionLabel: send.occasionLabel, scheduledDate: send.scheduledDate,
    })
    return { outcome: "sent" }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await db.update(scheduledSends).set({ status: "failed", errorMessage: error.slice(0, 500) }).where(eq(scheduledSends.id, send.id))
    await dispatch(tenant.id, "note.failed", notePayload({
      event: "note.failed", tenant, contact, sendId: send.id,
      occasionType: send.occasionType, occasionLabel: send.occasionLabel, scheduledDate: send.scheduledDate,
      subject: send.emailSubject, body: send.emailBodyText, error,
    }))
    return { outcome: "failed", error }
  }
}
