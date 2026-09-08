import { NextResponse } from "next/server"
import { db, contacts } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ContactInput } from "@/lib/contact-input"
import { ensureSchema } from "@/lib/db/ensure"

export const runtime = "nodejs"

/** Edit one contact. Only the fields on ContactInput can be written. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  try {
    await ensureSchema()
    const { id } = await params
    const parsed = ContactInput.partial().safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "That value is not valid. Dates are YYYY-MM-DD and email must be an email." }, { status: 400 })
    }
    const update = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined))
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })

    const [updated] = await db
      .update(contacts)
      .set({ ...update, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, gate.tenant.id)))
      .returning()
    if (!updated) return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  try {
    const { id } = await params
    await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.tenantId, gate.tenant.id)))
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
