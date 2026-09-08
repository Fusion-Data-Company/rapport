import { NextResponse } from "next/server"
import { db, contactDates } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"

export const runtime = "nodejs"

/** Remove one custom date. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; dateId: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { id, dateId } = await ctx.params
  const rows = await db.delete(contactDates)
    .where(and(eq(contactDates.id, dateId), eq(contactDates.contactId, id), eq(contactDates.tenantId, gate.tenant.id)))
    .returning({ id: contactDates.id })
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
