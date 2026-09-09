import { NextResponse } from "next/server"
import { db, contacts, scheduledSends } from "@/lib/db"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"

export const runtime = "nodejs"

export type BookHealth = {
  active: number
  unsubscribed: number
  tierA: number
  tierB: number
  tierC: number
  withEmail: number
  withMoneyDate: number
  withAnyDate: number
  /** Contacts Rapport can actually act on: an address AND a date. */
  reachable: number
  /** reachable / active, rounded. The one number that says whether the book works. */
  coverage: number
}

export type RecentSend = {
  id: string
  name: string
  occasionLabel: string
  occasionType: string
  subject: string | null
  sentAt: string | null
  opened: boolean
  status: string
  cardImageUrl: string | null
}

/**
 * Everything the dashboard needs that is not already on /api/schedule/upcoming:
 * the shape of the book, and the last few notes that actually left the mailbox.
 */
export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const t = gate.tenant.id

  const hasDate = sql`(
    ${contacts.birthdate} IS NOT NULL OR ${contacts.anniversary} IS NOT NULL OR
    ${contacts.policyRenewalDate} IS NOT NULL OR ${contacts.loanClosedDate} IS NOT NULL OR
    ${contacts.homePurchaseDate} IS NOT NULL
  )`
  const hasMoneyDate = sql`(
    ${contacts.policyRenewalDate} IS NOT NULL OR ${contacts.loanClosedDate} IS NOT NULL OR
    ${contacts.homePurchaseDate} IS NOT NULL
  )`
  const hasEmail = sql`(${contacts.email} IS NOT NULL AND ${contacts.email} <> '')`

  const [row] = await db.select({
    active: sql<number>`count(*) filter (where ${contacts.status} = 'active')`,
    unsubscribed: sql<number>`count(*) filter (where ${contacts.unsubscribed})`,
    tierA: sql<number>`count(*) filter (where ${contacts.tier} = 'A')`,
    tierB: sql<number>`count(*) filter (where ${contacts.tier} = 'B')`,
    tierC: sql<number>`count(*) filter (where ${contacts.tier} = 'C')`,
    withEmail: sql<number>`count(*) filter (where ${hasEmail})`,
    withMoneyDate: sql<number>`count(*) filter (where ${hasMoneyDate})`,
    withAnyDate: sql<number>`count(*) filter (where ${hasDate})`,
    reachable: sql<number>`count(*) filter (where ${hasEmail} and ${hasDate} and not ${contacts.unsubscribed})`,
  }).from(contacts).where(eq(contacts.tenantId, t))

  const active = Number(row?.active ?? 0)
  const reachable = Number(row?.reachable ?? 0)

  const book: BookHealth = {
    active,
    unsubscribed: Number(row?.unsubscribed ?? 0),
    tierA: Number(row?.tierA ?? 0),
    tierB: Number(row?.tierB ?? 0),
    tierC: Number(row?.tierC ?? 0),
    withEmail: Number(row?.withEmail ?? 0),
    withMoneyDate: Number(row?.withMoneyDate ?? 0),
    withAnyDate: Number(row?.withAnyDate ?? 0),
    reachable,
    coverage: active > 0 ? Math.round((reachable / active) * 100) : 0,
  }

  const since = new Date()
  since.setDate(since.getDate() - 90)

  const rows = await db.query.scheduledSends.findMany({
    where: and(
      eq(scheduledSends.tenantId, t),
      eq(scheduledSends.status, "sent"),
      gte(scheduledSends.sentAt!, since),
    ),
    with: { contact: true },
    orderBy: [desc(scheduledSends.sentAt)],
    limit: 6,
  })

  const recent: RecentSend[] = rows.map(({ contact, ...s }) => ({
    id: s.id,
    name: [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || "A contact",
    occasionLabel: s.occasionLabel,
    occasionType: s.occasionType,
    subject: s.emailSubject,
    sentAt: s.sentAt ? s.sentAt.toISOString() : null,
    opened: !!s.openedAt,
    status: s.status,
    cardImageUrl: s.cardImageUrl,
  }))

  return NextResponse.json({ book, recent })
}
