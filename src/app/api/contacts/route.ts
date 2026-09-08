import { NextResponse } from "next/server"
import { db, contacts } from "@/lib/db"
import { eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ContactInput, seatCapError } from "@/lib/contact-input"

export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  try {
    const rows = await db.query.contacts.findMany({
      where: eq(contacts.tenantId, gate.tenant.id),
      with: { children: true, sportsTeams: true },
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    })
    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  try {
    const parsed = ContactInput.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "First name is required; dates are YYYY-MM-DD; email must be an email." }, { status: 400 })
    const cap = await seatCapError(gate.tenant.id, gate.tenant.seats, 1)
    if (cap) return NextResponse.json({ error: cap }, { status: 402 })
    const [contact] = await db.insert(contacts).values({ ...parsed.data, tenantId: gate.tenant.id, source: "manual" }).returning()
    return NextResponse.json(contact, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
