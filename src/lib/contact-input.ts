import { z } from "zod"
import { db, contacts } from "@/lib/db"
import { and, eq, sql } from "drizzle-orm"
import { CONTACTS_PER_SEAT } from "@/lib/billing"

const str = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null))
const dateStr = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().transform((v) => (v ? v : null))

/** The fields a contact may be created or edited with. Nothing else reaches the insert. */
export const ContactInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: str(80),
  nickname: str(80),
  email: z.string().trim().email().max(320).optional().nullable().transform((v) => (v ? v.toLowerCase() : null)),
  phone: str(40),
  birthdate: dateStr,
  anniversary: dateStr,
  placeHometown: str(120),
  spouseName: str(120),
  spouseOccupation: str(120),
  companyName: str(160),
  jobTitle: str(120),
  city: str(80),
  state: str(40),
  zip: str(20),
  college: str(120),
  hobbies: str(500),
  carType: str(80),
  internalNotes: str(4000),
  sensitiveTopics: str(500),
  facebookUrl: str(300),
  linkedinUrl: str(300),
  instagramUrl: str(300),
  twitterUrl: str(300),
  tiktokUrl: str(300),
  websiteUrl: str(300),
})
export type ContactInputT = z.infer<typeof ContactInput>

export async function activeContactCount(tenantId: string): Promise<number> {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(contacts)
    .where(and(eq(contacts.tenantId, tenantId), eq(contacts.status, "active")))
  return Number(rows[0]?.n ?? 0)
}

/** Seats x 250 is the plan. Returns the error message when adding `adding` more would pass it. */
export async function seatCapError(tenantId: string, seats: number, adding: number): Promise<string | null> {
  const cap = Math.max(1, seats) * CONTACTS_PER_SEAT
  const have = await activeContactCount(tenantId)
  if (have + adding > cap) {
    return `Your plan covers ${cap} contacts (${seats} seat${seats === 1 ? "" : "s"} x ${CONTACTS_PER_SEAT}). You have ${have}; adding ${adding} would pass it. Add a seat under Settings, Billing.`
  }
  return null
}
