import { NextResponse } from "next/server"
import { db, contacts } from "@/lib/db"
import { requireAccess } from "@/lib/tenant"
import { seatCapError } from "@/lib/contact-input"

const MAX_ROWS = 5000

export async function POST(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const tenantId = gate.tenant.id
  try {
    const { contacts: rows } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No contacts" }, { status: 400 })
    }
    if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Import at most ${MAX_ROWS} rows at a time.` }, { status: 400 })
    const cap = await seatCapError(tenantId, gate.tenant.seats, rows.length)
    if (cap) return NextResponse.json({ error: cap }, { status: 402 })

    const toInsert = rows.map((r: Record<string, string>) => {
      // Split "name" field into first/last if needed
      let firstName = r.firstName ?? ""
      let lastName = r.lastName ?? ""
      if (!firstName && r.name) {
        const parts = r.name.trim().split(" ")
        firstName = parts[0] ?? ""
        lastName = parts.slice(1).join(" ") ?? ""
      }

      return {
        tenantId,
        firstName: firstName || "Unknown",
        lastName: lastName || null,
        email: r.email || null,
        phone: r.phone || null,
        companyName: r.companyName || null,
        jobTitle: r.jobTitle || null,
        city: r.city || null,
        state: r.state || null,
        zip: r.zip || null,
        birthdate: r.birthdate || null,
        anniversary: r.anniversary || null,
        spouseName: r.spouseName || null,
        spouseOccupation: r.spouseOccupation || null,
        college: r.college || null,
        hobbies: r.hobbies || null,
        carType: r.carType || null,
        placeHometown: r.placeHometown || null,
        internalNotes: r.internalNotes || null,
        facebookUrl: r.facebookUrl || null,
        linkedinUrl: r.linkedinUrl || null,
        instagramUrl: r.instagramUrl || null,
        twitterUrl: r.twitterUrl || null,
        tiktokUrl: r.tiktokUrl || null,
        websiteUrl: r.websiteUrl || null,
        nickname: r.nickname || null,
        source: "csv_import" as const,
      }
    })

    const inserted = await db.insert(contacts).values(toInsert).returning({ id: contacts.id })
    return NextResponse.json({ inserted: inserted.length })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
