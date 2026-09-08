import { NextResponse } from "next/server"
import { db, contacts, scheduledSends, tenantLlmConfig } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { open } from "@/lib/crypto"
import { claimSend } from "@/lib/send-guard"
import { generateEmailContent, type LLMConfig } from "@/lib/llm"
import { formatHistory, recentTimeline } from "@/lib/timeline"
import { todayISO } from "@/lib/dates"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * Ask this one person for a review, now.
 *
 * The automatic ask fires a set number of days after a closing; this is the manual
 * version for the client who just said something kind on the phone. It lands in the
 * approval queue like everything else, so the agent reads it before it goes.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()

  const link = gate.tenant.googleReviewUrl?.trim()
  if (!link) {
    return NextResponse.json({ error: "Add your Google review link under Settings, Timing and review first." }, { status: 400 })
  }

  const { id } = await ctx.params
  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.tenantId, gate.tenant.id)),
  })
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 })
  if (!contact.email) return NextResponse.json({ error: "This contact has no email address." }, { status: 400 })
  if (contact.unsubscribed || contact.status !== "active") {
    return NextResponse.json({ error: "This contact has unsubscribed." }, { status: 400 })
  }

  const already = await db.query.scheduledSends.findFirst({
    where: and(
      eq(scheduledSends.tenantId, gate.tenant.id),
      eq(scheduledSends.contactId, contact.id),
      eq(scheduledSends.occasionType, "review_request"),
    ),
    columns: { id: true, status: true },
  })
  if (already) {
    return NextResponse.json({ error: "You have already asked this person for a review. Rapport asks once." }, { status: 409 })
  }

  const today = todayISO()
  const first = contact.nickname?.trim() || contact.firstName
  const sendId = await claimSend({
    tenantId: gate.tenant.id, contactId: contact.id,
    occasionType: "review_request", occasionLabel: "Review request", scheduledDate: today,
  })
  if (!sendId) return NextResponse.json({ error: "A review request for today already exists." }, { status: 409 })

  let subject = `A quick favour, ${first}`
  let body = `${first},\n\nIf the last few months went the way I hope they did, would you mind leaving a short Google review? It helps more than you would think, and it takes about a minute.`

  try {
    const llmCfg = await db.query.tenantLlmConfig.findFirst({ where: eq(tenantLlmConfig.tenantId, gate.tenant.id) })
    const config: LLMConfig = {
      provider: llmCfg?.provider ?? "openrouter",
      model: llmCfg?.model ?? "google/gemma-4-26b-a4b-it",
      apiKey: open(llmCfg?.apiKeyEncrypted) ?? process.env.OPENROUTER_API_KEY,
      temperature: llmCfg?.temperature ?? 0.7,
    }
    const written = await generateEmailContent({
      occasion: "Review request",
      occasionPrompt: `Ask ${first}, once and lightly, whether they would leave a short Google review. Two sentences at most. Do not include a link or a URL; one is added under your note. Do not offer anything in exchange for a review.`,
      contactFirstName: first,
      context: {
        company: contact.companyName,
        occupation: contact.jobTitle,
      },
      businessName: gate.tenant.businessName,
      senderName: gate.tenant.fromName,
      history: formatHistory(await recentTimeline(contact.id)),
      sensitiveTopics: contact.sensitiveTopics,
      llmConfig: config,
    })
    subject = written.subject
    body = written.body
  } catch (e) {
    // A writer that is down should not stop the agent asking. The plain draft stands
    // and is editable in the queue like any other note.
    console.error("review request draft failed, using the plain version:", e)
  }

  const finalBody = `${body}\n\nHere is the link, it takes a minute: ${link}`
  await db.update(scheduledSends)
    .set({ status: "pending_approval", emailSubject: subject, emailBodyText: finalBody })
    .where(eq(scheduledSends.id, sendId))

  return NextResponse.json({ ok: true, id: sendId, subject, body: finalBody }, { status: 201 })
}
