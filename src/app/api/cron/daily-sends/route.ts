import { NextResponse } from "next/server"
import { db, contacts, contactChildren, scheduledSends, cardTemplates, tenants, tenantLlmConfig, tenantEmailConfig, sendLog } from "@/lib/db"
import { eq, and, sql } from "drizzle-orm"
import { generateEmailContent, type LLMConfig } from "@/lib/llm"
import { Resend } from "resend"

export const runtime = "nodejs"
export const maxDuration = 300

function todayMMDD() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${m}-${day}`
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mmdd = todayMMDD()
  let processed = 0; let failed = 0

  try {
    // Find contacts with birthday today
    const birthdayContacts = await db.query.contacts.findMany({
      where: and(
        eq(contacts.status, "active"),
        sql`TO_CHAR(${contacts.birthdate}::date, 'MM-DD') = ${mmdd}`
      ),
      with: { children: true, sportsTeams: true },
    })

    // Find contacts with anniversary today
    const anniversaryContacts = await db.query.contacts.findMany({
      where: and(
        eq(contacts.status, "active"),
        sql`TO_CHAR(${contacts.anniversary}::date, 'MM-DD') = ${mmdd}`
      ),
    })

    // Find children with birthday today
    const childBirthdays = await db.query.contactChildren.findMany({
      where: sql`TO_CHAR(${contactChildren.birthdate}::date, 'MM-DD') = ${mmdd}`,
    })

    // Pending sports sends for today
    const today = new Date().toISOString().split("T")[0]
    const pendingSportsSends = await db.query.scheduledSends.findMany({
      where: and(
        eq(scheduledSends.scheduledDate, today),
        eq(scheduledSends.status, "pending"),
        sql`${scheduledSends.sportsEventId} IS NOT NULL`
      ),
    })

    const allTasks = [
      ...birthdayContacts.map(c => ({ type: "birthday" as const, contact: c })),
      ...anniversaryContacts.map(c => ({ type: "anniversary" as const, contact: c })),
      ...childBirthdays.map(c => ({ type: "child_birthday" as const, child: c })),
    ]

    for (const task of allTasks) {
      const contactData = "contact" in task ? task.contact : null
      if (!contactData) continue

      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, contactData.tenantId) })
      if (!tenant) continue

      const llmCfg = await db.query.tenantLlmConfig.findFirst({ where: eq(tenantLlmConfig.tenantId, tenant.id) })
      const llmConfig: LLMConfig = {
        provider: llmCfg?.provider ?? "openrouter",
        model: llmCfg?.model ?? "google/gemma-4-26b-a4b-it",
        apiKey: llmCfg?.apiKeyEncrypted ?? process.env.OPENROUTER_API_KEY,
        temperature: llmCfg?.temperature ?? 0.7,
      }

      try {
        const { subject, body } = await generateEmailContent({
          occasion: task.type === "child_birthday" ? "child's birthday" : task.type.replace("_", " "),
          contactFirstName: contactData.firstName,
          context: {
            "spouse": contactData.spouseName,
            "children": (contactData as any).children?.map((c: any) => `${c.name} (${c.interests || ""})`.trim()).join(", "),
            "hobbies": contactData.hobbies,
            "hometown": contactData.placeHometown,
            "college": contactData.college,
            "car": contactData.carType,
            "occupation": contactData.jobTitle ? `${contactData.jobTitle}${contactData.companyName ? ` at ${contactData.companyName}` : ""}` : null,
          },
          businessName: tenant.businessName,
          sensitiveTopics: contactData.sensitiveTopics,
          llmConfig,
        })

        // Get card
        const card = await db.query.cardTemplates.findFirst({
          where: and(
            eq(cardTemplates.occasionType, task.type),
            eq(cardTemplates.isActive, true),
          ),
        })

        // Send email
        const emailCfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, tenant.id) })
        const toEmail = contactData.email
        if (!toEmail) { processed++; continue }

        await sendEmail({
          apiKey: emailCfg?.apiKeyEncrypted ?? process.env.RESEND_API_KEY!,
          provider: emailCfg?.provider ?? "resend",
          from: `${tenant.fromName} <${tenant.fromEmail}>`,
          to: toEmail,
          subject,
          html: buildEmailHtml({ body, cardUrl: card?.imageUrl, businessName: tenant.businessName, fromName: tenant.fromName }),
        })

        // Log
        await db.insert(scheduledSends).values({
          tenantId: tenant.id,
          contactId: contactData.id,
          occasionType: task.type,
          occasionLabel: task.type === "birthday" ? `${contactData.firstName}'s Birthday` : task.type === "anniversary" ? "Anniversary" : "Child's Birthday",
          scheduledDate: today,
          status: "sent",
          emailSubject: subject,
          emailBodyText: body,
          sentAt: new Date(),
        })

        processed++
      } catch (e) {
        console.error(`Send failed for contact ${contactData.id}:`, e)
        failed++
      }
    }

    // Process pending sports sends
    for (const send of pendingSportsSends) {
      try {
        const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, send.contactId) })
        const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, send.tenantId) })
        if (!contact?.email || !tenant) continue

        const emailCfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, send.tenantId) })
        const card = await db.query.cardTemplates.findFirst({ where: and(eq(cardTemplates.occasionType, send.occasionType), eq(cardTemplates.isActive, true)) })

        await sendEmail({
          apiKey: emailCfg?.apiKeyEncrypted ?? process.env.RESEND_API_KEY!,
          provider: emailCfg?.provider ?? "resend",
          from: `${tenant.fromName} <${tenant.fromEmail}>`,
          to: contact.email,
          subject: send.emailSubject ?? "Thinking of you!",
          html: buildEmailHtml({ body: send.emailBodyText ?? "", cardUrl: card?.imageUrl, businessName: tenant.businessName, fromName: tenant.fromName }),
        })

        await db.update(scheduledSends).set({ status: "sent", sentAt: new Date() }).where(eq(scheduledSends.id, send.id))
        processed++
      } catch (e) {
        console.error("Sports send failed:", e)
        await db.update(scheduledSends).set({ status: "failed", errorMessage: String(e) }).where(eq(scheduledSends.id, send.id))
        failed++
      }
    }

    return NextResponse.json({ ok: true, processed, failed })
  } catch (e) {
    console.error("Daily cron error:", e)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }
}

async function sendEmail({ apiKey, provider, from, to, subject, html }: {
  apiKey: string; provider: string; from: string; to: string; subject: string; html: string
}) {
  if (provider === "resend" || provider === "resend") {
    const resend = new Resend(apiKey)
    await resend.emails.send({ from, to, subject, html })
  }
  // TODO: sendgrid, gmail providers
}

function buildEmailHtml({ body, cardUrl, businessName, fromName }: {
  body: string; cardUrl?: string | null; businessName: string; fromName: string
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${businessName}</title></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 20px;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#0f1c30;border-radius:16px;overflow:hidden;border:1px solid rgba(43,168,162,0.2);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1E8C86,#2BA8A2);padding:20px 32px;">
          <p style="margin:0;color:white;font-family:'Georgia',serif;font-size:22px;font-weight:bold;">${businessName}</p>
        </td></tr>
        <!-- Card image -->
        ${cardUrl ? `<tr><td style="padding:0;"><img src="${cardUrl}" alt="Card" style="width:100%;display:block;max-height:280px;object-fit:cover;"></td></tr>` : ""}
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0;color:#f1f5f9;font-size:17px;line-height:1.7;font-family:Georgia,serif;">${body.replace(/\n/g, "<br>")}</p>
          <p style="margin:28px 0 0;color:#2BA8A2;font-size:15px;font-weight:bold;">Warmly,<br>${fromName}</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid rgba(43,168,162,0.1);">
          <p style="margin:0;color:rgba(148,163,184,0.5);font-size:11px;">
            You received this because you're valued by ${businessName}.
            <a href="{{{unsubscribe_url}}}" style="color:rgba(148,163,184,0.5);">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
