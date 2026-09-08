import { NextResponse } from "next/server"
import { db, contacts } from "@/lib/db"
import { eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ContactInput } from "@/lib/contact-input"
import { allowanceFor } from "@/lib/tiers"
import { ensureSchema } from "@/lib/db/ensure"

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
    await ensureSchema()
    const [contact] = await db.insert(contacts).values({ ...parsed.data, tenantId: gate.tenant.id, source: "manual" }).returning()
    // The plan allowance is a soft limit: the contact is saved either way, and the
    // notice rides along so the UI can say where the book now stands.
    const allowance = await allowanceFor(gate.tenant)
    return NextResponse.json({ ...contact, planNotice: allowance.notice }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
