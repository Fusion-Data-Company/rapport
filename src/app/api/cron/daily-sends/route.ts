import { NextResponse } from "next/server"
import { db, contacts, scheduledSends, tenants, tenantEmailConfig, tenantLlmConfig } from "@/lib/db"
import { eq, and, or, inArray, sql } from "drizzle-orm"
import { open } from "@/lib/crypto"
import { claimSend, ensureSendGuard, tenantMaySend, tenantNeedsApproval } from "@/lib/send-guard"
import { generateEmailContent, type LLMConfig } from "@/lib/llm"
import { cardForNote, deliver, deliverWrittenRow, notePayload } from "@/lib/deliver"
import { dispatch } from "@/lib/webhooks"
import type { BodyStyle } from "@/lib/email-body"
import { capState } from "@/lib/send-caps"
import { addDays, addMonths, todayISO, type ISODate } from "@/lib/dates"
import { milestoneMonthsFor, occasionsForDay, renewalLeadDaysFor, type ContactForOccasions, type DueOccasion } from "@/lib/occasions"
import { formatHistory, recentTimeline } from "@/lib/timeline"
import { askedForReview, lastSentByContact, withinTierGap } from "@/lib/tiers"

export const runtime = "nodejs"
export const maxDuration = 300

type Tenant = typeof tenants.$inferSelect

async function loadLlmConfig(tenantId: string): Promise<LLMConfig> {
  const llmCfg = await db.query.tenantLlmConfig.findFirst({ where: eq(tenantLlmConfig.tenantId, tenantId) })
  return {
    provider: llmCfg?.provider ?? "openrouter",
    model: llmCfg?.model ?? "google/gemma-4-26b-a4b-it",
    apiKey: open(llmCfg?.apiKeyEncrypted) ?? process.env.OPENROUTER_API_KEY,
    temperature: llmCfg?.temperature ?? 0.7,
  }
}

/**
 * The contacts that could have something due today, narrowed in SQL so a book of
 * five thousand does not come back whole. The occasion engine has the final say.
 */
async function candidatesFor(tenant: Tenant, today: ISODate): Promise<ContactForOccasions[]> {
  const mmdd = today.slice(5)
  const renewalMmdd = addDays(today, renewalLeadDaysFor(tenant)).slice(5)
  // "N months since close" reaches backwards: a close date exactly N months ago.
  const closeDates = milestoneMonthsFor(tenant).map((m) => addMonths(today, -m))

  const rows = await db.query.contacts.findMany({
    where: and(
      eq(contacts.tenantId, tenant.id),
      eq(contacts.status, "active"),
      eq(contacts.unsubscribed, false),
      or(
        sql`to_char(${contacts.birthdate}::date, 'MM-DD') = ${mmdd}`,
        sql`to_char(${contacts.anniversary}::date, 'MM-DD') = ${mmdd}`,
        sql`to_char(${contacts.policyRenewalDate}::date, 'MM-DD') = ${renewalMmdd}`,
        sql`to_char(${contacts.loanClosedDate}::date, 'MM-DD') = ${mmdd}`,
        sql`to_char(${contacts.homePurchaseDate}::date, 'MM-DD') = ${mmdd}`,
        inArray(contacts.loanClosedDate, closeDates),
        inArray(contacts.homePurchaseDate, closeDates),
        sql`exists (select 1 from contact_children ch where ch.contact_id = ${contacts.id} and to_char(ch.birthdate::date, 'MM-DD') = ${mmdd})`,
        sql`exists (select 1 from contact_dates cd where cd.contact_id = ${contacts.id} and cd.is_active and (to_char(cd.date::date, 'MM-DD') = ${mmdd} or cd.date = ${today}))`,
      ),
    ),
    with: { children: true, customDates: true },
  })
  return rows as ContactForOccasions[]
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = todayISO()
  let processed = 0, failed = 0, held = 0, skipped = 0, deferred = 0

  try {
    await ensureSendGuard()
    const allTenants = await db.query.tenants.findMany()

    for (const tenant of allTenants) {
      if (!tenantMaySend(tenant)) { skipped++; continue }

      const emailCfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, tenant.id) })
      const style: BodyStyle = emailCfg?.bodyStyle === "card" ? "card" : "plain"
      const caps = await capState({ tenantId: tenant.id, dailyCap: emailCfg?.dailyCap, warmupStartedAt: emailCfg?.warmupStartedAt })
      let budget = caps.remaining
      const alwaysReview = tenant.alwaysReview
      const needsApproval = alwaysReview || (await tenantNeedsApproval(tenant.id))
      const llm = await loadLlmConfig(tenant.id)

      const book = await candidatesFor(tenant, today)
      // Tier cadence: A hears about everything, C hears from you a few times a year.
      const lastSent = await lastSentByContact(tenant.id, book.map((c) => c.id))
      const asked = await askedForReview(tenant.id, book.map((c) => c.id))
      const due: { occasion: DueOccasion; contact: ContactForOccasions }[] = []
      for (const contact of book) {
        if (withinTierGap({ tier: contact.tier, lastSent: lastSent.get(contact.id), on: today, settings: tenant })) {
          skipped++
          continue
        }
        for (const occasion of occasionsForDay(contact, tenant, today, asked.has(contact.id))) {
          due.push({ occasion, contact })
        }
      }

      for (const { occasion, contact } of due) {
        if (!contact.email) { skipped++; continue }

        const sendId = await claimSend({
          tenantId: tenant.id, contactId: contact.id,
          occasionType: occasion.type, occasionLabel: occasion.label, scheduledDate: today,
        })
        if (!sendId) continue // already handled today

        try {
          const history = formatHistory(await recentTimeline(contact.id))
          const { subject, body } = await generateEmailContent({
            occasion: occasion.label,
            occasionPrompt: occasion.prompt,
            contactFirstName: contact.nickname?.trim() || contact.firstName,
            context: {
              spouse: contact.spouseName,
              children: contact.children?.map((c) => `${c.name}${c.interests ? ` (${c.interests})` : ""}`).join(", "),
              hobbies: contact.hobbies,
              hometown: contact.placeHometown,
              college: contact.college,
              car: contact.carType,
              occupation: contact.jobTitle ? `${contact.jobTitle}${contact.companyName ? ` at ${contact.companyName}` : ""}` : null,
            },
            businessName: tenant.businessName,
            senderName: tenant.fromName,
            history,
            sensitiveTopics: contact.sensitiveTopics,
            llmConfig: llm,
          })
          // A review link has to survive the model, so it is appended after drafting
          // rather than trusted to come back out of the prompt intact.
          const finalBody = occasion.appendix ? `${body}\n\n${occasion.appendix}` : body
          // The card is made for this contact, with their name on it. A child's
          // birthday card carries the child's name, because that is whose day it is.
          const card = await cardForNote({
            tenantId: tenant.id,
            occasion: occasion.type,
            name: occasion.childName ?? contact.nickname?.trim() ?? contact.firstName,
          })

          if (needsApproval) {
            // Written, not sent. The Schedule page releases it.
            await db.update(scheduledSends)
              .set({
                status: "pending_approval", emailSubject: subject, emailBodyText: finalBody,
                cardTemplateId: card.templateId, cardImageUrl: card.imageUrl, cardSource: card.source,
              })
              .where(eq(scheduledSends.id, sendId))
            await dispatch(tenant.id, "note.held", notePayload({
              event: "note.held", tenant, contact, sendId,
              occasionType: occasion.type, occasionLabel: occasion.label, scheduledDate: today,
              subject, body: finalBody,
            }))
            held++
            continue
          }
          if (budget <= 0) {
            await db.update(scheduledSends)
              .set({
                status: "deferred", emailSubject: subject, emailBodyText: finalBody,
                cardTemplateId: card.templateId, cardImageUrl: card.imageUrl, cardSource: card.source,
                errorMessage: "Held back by today's mailbox send cap.",
              })
              .where(eq(scheduledSends.id, sendId))
            deferred++
            continue
          }

          await db.update(scheduledSends)
            .set({ cardTemplateId: card.templateId, cardImageUrl: card.imageUrl, cardSource: card.source })
            .where(eq(scheduledSends.id, sendId))
          await deliver({
            sendId, tenant, contact, subject, body: finalBody, cardUrl: card.imageUrl, style,
            occasionType: occasion.type, occasionLabel: occasion.label, scheduledDate: today,
          })
          budget--
          processed++
        } catch (e) {
          console.error(`Send failed for contact ${contact.id}:`, e)
          await db.update(scheduledSends).set({ status: "failed", errorMessage: String(e).slice(0, 500) }).where(eq(scheduledSends.id, sendId))
          failed++
        }
      }

      // Rows already written and waiting: approved by the agent, deferred by yesterday's
      // cap, or queued by the sports monitor.
      const queued = await db.query.scheduledSends.findMany({
        where: and(
          eq(scheduledSends.tenantId, tenant.id),
          eq(scheduledSends.scheduledDate, today),
          inArray(scheduledSends.status, ["approved", "deferred", "pending"]),
          sql`${scheduledSends.emailSubject} is not null`,
        ),
      })
      for (const send of queued) {
        if (send.status === "pending" && !send.sportsEventId) continue // occasion rows are claimed above
        const { outcome } = await deliverWrittenRow({ send, tenant, style, budget })
        if (outcome === "sent") { budget--; processed++ }
        else if (outcome === "deferred") deferred++
        else if (outcome === "failed") failed++
        else skipped++
      }
    }

    return NextResponse.json({ ok: true, processed, failed, held, skipped, deferred })
  } catch (e) {
    console.error("Daily cron error:", e)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }
}
