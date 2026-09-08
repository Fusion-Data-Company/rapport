import { NextResponse } from "next/server"
import { db, contacts, contactChildren, scheduledSends, cardTemplates, tenants, tenantEmailConfig, tenantLlmConfig, sendLog } from "@/lib/db"
import { eq, and, or, isNull, inArray, sql } from "drizzle-orm"
import { open } from "@/lib/crypto"
import { claimSend, ensureSendGuard, tenantMaySend, tenantNeedsApproval } from "@/lib/send-guard"
import { generateEmailContent, type LLMConfig } from "@/lib/llm"
import { sendMail } from "@/lib/mailer"
import { unsubscribeUrl } from "@/lib/unsubscribe"
import { buildNote, type BodyStyle } from "@/lib/email-body"
import { capState, type CapState } from "@/lib/send-caps"

export const runtime = "nodejs"
export const maxDuration = 300

function todayMMDD() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${m}-${day}`
}

type Occasion = "birthday" | "anniversary" | "child_birthday"

async function loadLlmConfig(tenantId: string): Promise<LLMConfig> {
  const llmCfg = await db.query.tenantLlmConfig.findFirst({ where: eq(tenantLlmConfig.tenantId, tenantId) })
  return {
    provider: llmCfg?.provider ?? "openrouter",
    model: llmCfg?.model ?? "google/gemma-4-26b-a4b-it",
    apiKey: open(llmCfg?.apiKeyEncrypted) ?? process.env.OPENROUTER_API_KEY,
    temperature: llmCfg?.temperature ?? 0.7,
  }
}

/** The tenant's own card for the occasion, else a system card; never another tenant's. */
async function cardFor(tenantId: string, occasion: string) {
  return db.query.cardTemplates.findFirst({
    where: and(
      eq(cardTemplates.occasionType, occasion),
      eq(cardTemplates.isActive, true),
      or(eq(cardTemplates.tenantId, tenantId), isNull(cardTemplates.tenantId)),
    ),
    orderBy: (c, { desc }) => [desc(c.tenantId)],
  })
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mmdd = todayMMDD()
  const today = new Date().toISOString().split("T")[0]
  let processed = 0; let failed = 0; let held = 0; let skipped = 0; let deferred = 0

  try {
    await ensureSendGuard()

    const birthdayContacts = await db.query.contacts.findMany({
      where: and(eq(contacts.status, "active"), eq(contacts.unsubscribed, false), sql`TO_CHAR(${contacts.birthdate}::date, 'MM-DD') = ${mmdd}`),
      with: { children: true },
    })
    const anniversaryContacts = await db.query.contacts.findMany({
      where: and(eq(contacts.status, "active"), eq(contacts.unsubscribed, false), sql`TO_CHAR(${contacts.anniversary}::date, 'MM-DD') = ${mmdd}`),
      with: { children: true },
    })
    // A child's birthday is a note to the parent (the contact), about the child.
    const childBirthdays = await db.query.contactChildren.findMany({
      where: sql`TO_CHAR(${contactChildren.birthdate}::date, 'MM-DD') = ${mmdd}`,
      with: { contact: { with: { children: true } } },
    })

    type Task = { type: Occasion; contact: typeof birthdayContacts[number]; childName?: string }
    const tasks: Task[] = [
      ...birthdayContacts.map((c) => ({ type: "birthday" as const, contact: c })),
      ...anniversaryContacts.map((c) => ({ type: "anniversary" as const, contact: c })),
      ...childBirthdays
        .filter((ch) => ch.contact && ch.contact.status === "active" && !ch.contact.unsubscribed)
        .map((ch) => ({ type: "child_birthday" as const, contact: ch.contact as typeof birthdayContacts[number], childName: ch.name })),
    ]

    type TenantInfo = {
      tenant: Tenant | null
      llm: LLMConfig | null
      needsApproval: boolean
      style: BodyStyle
      caps: CapState | null
      /** Counted down as the run delivers, so the daily cap holds across every occasion. */
      budget: number
    }
    const tenantCache = new Map<string, TenantInfo>()
    async function tenantInfo(tenantId: string): Promise<TenantInfo> {
      let info = tenantCache.get(tenantId)
      if (!info) {
        const tenant = (await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })) ?? null
        const emailCfg = tenant ? await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, tenantId) }) : null
        const caps = tenant
          ? await capState({ tenantId, dailyCap: emailCfg?.dailyCap, warmupStartedAt: emailCfg?.warmupStartedAt })
          : null
        info = {
          tenant,
          llm: tenant ? await loadLlmConfig(tenantId) : null,
          needsApproval: tenant ? await tenantNeedsApproval(tenantId) : false,
          style: emailCfg?.bodyStyle === "card" ? "card" : "plain",
          caps,
          budget: caps?.remaining ?? 0,
        }
        tenantCache.set(tenantId, info)
      }
      return info
    }

    // Occasion notes: birthdays, anniversaries, children's birthdays. Held or sent once each.
    for (const task of tasks) {
      const contactData = task.contact
      const info = await tenantInfo(contactData.tenantId)
      const { tenant, llm, needsApproval } = info
      if (!tenant || !llm) continue
      if (!tenantMaySend(tenant)) { skipped++; continue }
      if (!contactData.email) { skipped++; continue }

      const occasionLabel = task.type === "birthday" ? `${contactData.firstName}'s Birthday`
        : task.type === "anniversary" ? "Anniversary"
        : `${task.childName ?? "Child"}'s Birthday`
      const sendId = await claimSend({ tenantId: tenant.id, contactId: contactData.id, occasionType: task.type, occasionLabel, scheduledDate: today })
      if (!sendId) continue // already handled today

      try {
        const { subject, body } = await generateEmailContent({
          occasion: task.type === "child_birthday" ? `${task.childName ?? "their child"}'s birthday` : task.type.replace("_", " "),
          contactFirstName: contactData.firstName,
          context: {
            spouse: contactData.spouseName,
            children: contactData.children?.map((c) => `${c.name} (${c.interests || ""})`.trim()).join(", "),
            hobbies: contactData.hobbies,
            hometown: contactData.placeHometown,
            college: contactData.college,
            car: contactData.carType,
            occupation: contactData.jobTitle ? `${contactData.jobTitle}${contactData.companyName ? ` at ${contactData.companyName}` : ""}` : null,
          },
          businessName: tenant.businessName,
          sensitiveTopics: contactData.sensitiveTopics,
          llmConfig: llm,
        })
        const card = await cardFor(tenant.id, task.type)

        if (needsApproval) {
          // First batch for this account: written, not sent. One click on the Schedule page releases it.
          await db.update(scheduledSends)
            .set({ status: "pending_approval", emailSubject: subject, emailBodyText: body, cardTemplateId: card?.id ?? null })
            .where(eq(scheduledSends.id, sendId))
          held++
          continue
        }

        if (info.budget <= 0) {
          // Past today's mailbox cap. The note is written and parked; it goes out next run.
          await db.update(scheduledSends)
            .set({ status: "deferred", emailSubject: subject, emailBodyText: body, cardTemplateId: card?.id ?? null, errorMessage: "Held back by today's mailbox send cap." })
            .where(eq(scheduledSends.id, sendId))
          deferred++
          continue
        }
        await deliver({ sendId, tenant, contact: contactData, subject, body, cardUrl: card?.imageUrl, style: info.style })
        info.budget--
        processed++
      } catch (e) {
        console.error(`Send failed for contact ${contactData.id}:`, e)
        await db.update(scheduledSends).set({ status: "failed", errorMessage: String(e).slice(0, 500) }).where(eq(scheduledSends.id, sendId))
        failed++
      }
    }

    // Approved first-batch rows and pending sports rows for today.
    const queued = await db.query.scheduledSends.findMany({
      where: and(eq(scheduledSends.scheduledDate, today), inArray(scheduledSends.status, ["approved", "pending", "deferred"]), sql`${scheduledSends.emailSubject} IS NOT NULL`),
    })
    for (const send of queued) {
      if (send.status === "pending" && !send.sportsEventId) continue // occasion rows are claimed above, never re-sent here
      try {
        const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, send.contactId) })
        const info = await tenantInfo(send.tenantId)
        const { tenant } = info
        if (!contact?.email || !tenant) { await db.update(scheduledSends).set({ status: "skipped", errorMessage: "No contact or tenant" }).where(eq(scheduledSends.id, send.id)); continue }
        if (!tenantMaySend(tenant)) { skipped++; continue }
        if (contact.unsubscribed || contact.status !== "active") {
          await db.update(scheduledSends).set({ status: "skipped", errorMessage: "Contact unsubscribed" }).where(eq(scheduledSends.id, send.id))
          continue
        }
        if (info.budget <= 0) { deferred++; continue }
        const card = send.cardTemplateId
          ? await db.query.cardTemplates.findFirst({ where: eq(cardTemplates.id, send.cardTemplateId) })
          : await cardFor(tenant.id, send.occasionType)
        await deliver({ sendId: send.id, tenant, contact, subject: send.emailSubject ?? "Thinking of you", body: send.emailBodyText ?? "", cardUrl: card?.imageUrl, style: info.style })
        info.budget--
        processed++
      } catch (e) {
        console.error("Queued send failed:", e)
        await db.update(scheduledSends).set({ status: "failed", errorMessage: String(e).slice(0, 500) }).where(eq(scheduledSends.id, send.id))
        failed++
      }
    }

    return NextResponse.json({ ok: true, processed, failed, held, skipped, deferred })
  } catch (e) {
    console.error("Daily cron error:", e)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }
}

type Tenant = typeof tenants.$inferSelect
type Contact = typeof contacts.$inferSelect

async function deliver({ sendId, tenant, contact, subject, body, cardUrl, style }: {
  sendId: string; tenant: Tenant; contact: Contact; subject: string; body: string; cardUrl?: string | null; style: BodyStyle
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
    .set({ status: "sent", emailSubject: subject, emailBodyText: body, emailBodyHtml: note.html, sentAt: new Date() })
    .where(eq(scheduledSends.id, sendId))
  await db.insert(sendLog).values({ tenantId: tenant.id, contactId: contact.id, scheduledSendId: sendId, eventType: "sent", metadata: { providerMessageId: result?.id ?? null } }).catch(() => undefined)
}
