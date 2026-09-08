import { NextResponse } from "next/server"
import { z } from "zod"
import { db, scheduledSends } from "@/lib/db"
import { and, eq, inArray } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"

const Body = z.object({ ids: z.array(z.string().uuid()).min(1).max(500).optional(), all: z.boolean().optional(), action: z.enum(["approve", "skip"]).default("approve") })

/** Release (or drop) held first-batch notes. The next cron run sends the approved ones. */
export async function POST(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Send ids or all:true" }, { status: 400 })
  const { ids, all, action } = parsed.data
  const where = all
    ? and(eq(scheduledSends.tenantId, gate.tenant.id), eq(scheduledSends.status, "pending_approval"))
    : and(eq(scheduledSends.tenantId, gate.tenant.id), eq(scheduledSends.status, "pending_approval"), inArray(scheduledSends.id, ids ?? []))
  const rows = await db.update(scheduledSends)
    .set(action === "approve" ? { status: "approved" } : { status: "skipped", errorMessage: "Skipped by you before sending" })
    .where(where)
    .returning({ id: scheduledSends.id })
  return NextResponse.json({ ok: true, count: rows.length, action })
}
