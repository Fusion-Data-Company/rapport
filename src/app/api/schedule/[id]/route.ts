import { NextResponse } from "next/server"
import { z } from "zod"
import { db, scheduledSends } from "@/lib/db"
import { and, eq, inArray } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"

export const runtime = "nodejs"

const Body = z.object({
  emailSubject: z.string().trim().min(1).max(200).optional(),
  emailBodyText: z.string().trim().min(1).max(4000).optional(),
})

/** Edit a held note in place. Only a note that has not gone out can be changed. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { id } = await ctx.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Give a subject or a body to change." }, { status: 400 })
  }

  const rows = await db.update(scheduledSends)
    .set(parsed.data)
    .where(and(
      eq(scheduledSends.id, id),
      eq(scheduledSends.tenantId, gate.tenant.id),
      inArray(scheduledSends.status, ["pending_approval", "approved", "deferred", "pending"]),
    ))
    .returning()
  if (rows.length === 0) {
    return NextResponse.json({ error: "That note has already gone out, so it cannot be edited." }, { status: 409 })
  }
  return NextResponse.json(rows[0])
}
