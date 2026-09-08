import { NextResponse } from "next/server"
import { db, contactDates, contacts } from "@/lib/db"
import { requireAccess } from "@/lib/tenant"
import { allowanceFor, normalizeTier } from "@/lib/tiers"
import { ensureSchema } from "@/lib/db/ensure"
import { parseDateInput } from "@/lib/dates"

const MAX_ROWS = 5000

const text = (v: unknown, max = 320): string | null => {
  const s = typeof v === "string" ? v.trim() : ""
  return s ? s.slice(0, max) : null
}

export async function POST(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const tenantId = gate.tenant.id
  try {
    await ensureSchema()
    const { contacts: rows } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No contacts" }, { status: 400 })
    }
    if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Import at most ${MAX_ROWS} rows at a time.` }, { status: 400 })

    const source = rows as Record<string, string>[]
    const toInsert = source.map((r) => {
      // "name" as one column is normal in AMS exports.
      let firstName = text(r.firstName, 80) ?? ""
      let lastName = text(r.lastName, 80) ?? ""
      if (!firstName && r.name) {
        const parts = String(r.name).trim().split(/\s+/)
        firstName = parts[0] ?? ""
        lastName = parts.slice(1).join(" ")
      }

      return {
        tenantId,
        firstName: firstName || "Unknown",
        lastName: lastName || null,
        nickname: text(r.nickname, 80),
        email: text(r.email)?.toLowerCase() ?? null,
        phone: text(r.phone, 40),
        companyName: text(r.companyName, 160),
        jobTitle: text(r.jobTitle, 120),
        city: text(r.city, 80),
        state: text(r.state, 40),
        zip: text(r.zip, 20),
        birthdate: parseDateInput(r.birthdate),
        anniversary: parseDateInput(r.anniversary),
        // The money dates
        policyRenewalDate: parseDateInput(r.policyRenewalDate),
        policyType: text(r.policyType, 80),
        loanClosedDate: parseDateInput(r.loanClosedDate),
        loanType: text(r.loanType, 80),
        homePurchaseDate: parseDateInput(r.homePurchaseDate),
        spouseName: text(r.spouseName, 120),
        spouseOccupation: text(r.spouseOccupation, 120),
        college: text(r.college, 120),
        hobbies: text(r.hobbies, 500),
        carType: text(r.carType, 80),
        placeHometown: text(r.placeHometown, 120),
        internalNotes: text(r.internalNotes, 4000),
        facebookUrl: text(r.facebookUrl, 300),
        linkedinUrl: text(r.linkedinUrl, 300),
        instagramUrl: text(r.instagramUrl, 300),
        twitterUrl: text(r.twitterUrl, 300),
        tiktokUrl: text(r.tiktokUrl, 300),
        websiteUrl: text(r.websiteUrl, 300),
        tier: normalizeTier(r.tier),
        source: "csv_import" as const,
      }
    })

    const inserted = await db.insert(contacts).values(toInsert).returning({ id: contacts.id })

    // A "custom date" pair on the row becomes a contact date, so an agency's own
    // milestone column survives the import instead of being dropped.
    const extraDates = inserted.flatMap(({ id }, i) => {
      const row = source[i]
      const date = parseDateInput(row?.customDate)
      const label = text(row?.customDateLabel, 80)
      return date && label ? [{ tenantId, contactId: id, label, date, recurrence: "annual" }] : []
    })
    if (extraDates.length > 0) await db.insert(contactDates).values(extraDates)

    // Soft limit: the import always lands, and the notice tells the agent where they are.
    const allowance = await allowanceFor(gate.tenant)
    return NextResponse.json({ inserted: inserted.length, customDates: extraDates.length, planNotice: allowance.notice })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
