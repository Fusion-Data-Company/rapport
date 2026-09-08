import { NextResponse } from "next/server"
import { db, contacts, scheduledSends } from "@/lib/db"
import { and, eq, gte, lte } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { todayISO, addDays } from "@/lib/dates"
import { occasionsForDay, type ContactForOccasions } from "@/lib/occasions"
import { lastSentByContact, withinTierGap } from "@/lib/tiers"

export const runtime = "nodejs"

export type ScheduleStatus =
  | "pending_approval" | "approved" | "sent" | "failed" | "skipped" | "deferred" | "pending" | "projected"

export type ScheduleItem = {
  /** null when this is a projection the cron has not written yet. */
  id: string | null
  contactId: string
  contactFirstName: string | null
  contactLastName: string | null
  contactEmail: string | null
  occasionType: string
  occasionLabel: string
  scheduledDate: string
  /** The date the note is about, when it differs from the send date. */
  eventDate: string | null
  status: ScheduleStatus
  emailSubject: string | null
  emailBodyText: string | null
  errorMessage: string | null
}

const WINDOW_DAYS = 30

/**
 * What is coming. Rows the cron has already written, plus a projection of every
 * occasion due in the next thirty days, so a book loaded this afternoon shows its
 * renewals tonight instead of staying empty until the first cron run.
 */
export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()

  const today = todayISO()
  const horizon = addDays(today, WINDOW_DAYS)

  const rows = await db.query.scheduledSends.findMany({
    where: and(
      eq(scheduledSends.tenantId, gate.tenant.id),
      gte(scheduledSends.scheduledDate, today),
      lte(scheduledSends.scheduledDate, horizon),
    ),
    with: { contact: true },
    limit: 500,
  })

  const written: ScheduleItem[] = rows.map(({ contact, ...s }) => ({
    id: s.id,
    contactId: s.contactId,
    contactFirstName: contact?.firstName ?? null,
    contactLastName: contact?.lastName ?? null,
    contactEmail: contact?.email ?? null,
    occasionType: s.occasionType,
    occasionLabel: s.occasionLabel,
    scheduledDate: s.scheduledDate,
    eventDate: null,
    status: s.status as ScheduleStatus,
    emailSubject: s.emailSubject,
    emailBodyText: s.emailBodyText,
    errorMessage: s.errorMessage,
  }))

  // Anything already written is not projected again.
  const taken = new Set(written.map((w) => `${w.contactId}|${w.occasionType}|${w.scheduledDate}`))

  const book = (await db.query.contacts.findMany({
    where: and(eq(contacts.tenantId, gate.tenant.id), eq(contacts.status, "active"), eq(contacts.unsubscribed, false)),
    with: { children: true, customDates: true },
    limit: 5000,
  })) as ContactForOccasions[]

  const byId = new Map(book.map((c) => [c.id, c]))
  // The projection obeys the same tier cadence the cron does, so what the agent sees
  // here is what will actually go out.
  const lastSent = await lastSentByContact(gate.tenant.id, book.map((c) => c.id))
  const projected: ScheduleItem[] = []
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = addDays(today, i)
    for (const contact of book) {
      if (withinTierGap({ tier: contact.tier, lastSent: lastSent.get(contact.id), on: day, settings: gate.tenant })) continue
      for (const occasion of occasionsForDay(contact, gate.tenant, day)) {
        const key = `${occasion.contactId}|${occasion.type}|${occasion.sendDate}`
        if (taken.has(key)) continue
        taken.add(key)
        const c = byId.get(occasion.contactId)
        projected.push({
          id: null,
          contactId: occasion.contactId,
          contactFirstName: c?.firstName ?? null,
          contactLastName: c?.lastName ?? null,
          contactEmail: c?.email ?? null,
          occasionType: occasion.type,
          occasionLabel: occasion.label,
          scheduledDate: occasion.sendDate,
          eventDate: occasion.eventDate ?? null,
          status: "projected",
          emailSubject: null,
          emailBodyText: null,
          errorMessage: null,
        })
      }
    }
  }

  const all = [...written, ...projected].sort((a, b) =>
    a.scheduledDate < b.scheduledDate ? -1 : a.scheduledDate > b.scheduledDate ? 1 : 0)
  return NextResponse.json(all.slice(0, 300))
}
