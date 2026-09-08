import { NextResponse } from "next/server"
import { db, contactTimeline } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"

export const runtime = "nodejs"

/** Remove one history entry. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; entryId: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { id, entryId } = await ctx.params
  const rows = await db.delete(contactTimeline)
    .where(and(eq(contactTimeline.id, entryId), eq(contactTimeline.contactId, id), eq(contactTimeline.tenantId, gate.tenant.id)))
    .returning({ id: contactTimeline.id })
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
