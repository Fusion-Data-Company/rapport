import { NextResponse } from "next/server"
import { z } from "zod"
import { db, scheduledSends } from "@/lib/db"
import { and, eq, inArray, lte } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { bodyStyleFor, deliverWrittenRow, remainingToday } from "@/lib/deliver"
import { todayISO } from "@/lib/dates"

export const runtime = "nodejs"
export const maxDuration = 120

const Body = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200).optional(),
  /** Everything held for today and earlier. */
  allToday: z.boolean().optional(),
  action: z.enum(["approve", "skip"]).default("approve"),
})

const HELD = ["pending_approval", "deferred"]

export type ApproveResult = {
  ok: true
  action: "approve" | "skip"
  sent: number
  deferred: number
  skipped: number
  failed: number
  /** Set when a send failed, so the agent sees why rather than a silent nothing. */
  message?: string
}

/**
 * Approve or skip held notes. Approving sends now: an agent who taps approve on their
 * phone at 7am should not wait for tomorrow's cron run, which is the whole point of a
 * two-minute morning queue.
 */
export async function POST(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Pass send ids or allToday:true." }, { status: 400 })
  const { ids, allToday, action } = parsed.data
  if (!ids && !allToday) return NextResponse.json({ error: "Pass send ids or allToday:true." }, { status: 400 })

  const today = todayISO()
  const scope = allToday
    ? and(
        eq(scheduledSends.tenantId, gate.tenant.id),
        inArray(scheduledSends.status, HELD),
        lte(scheduledSends.scheduledDate, today),
      )
    : and(
        eq(scheduledSends.tenantId, gate.tenant.id),
        inArray(scheduledSends.status, HELD),
        inArray(scheduledSends.id, ids ?? []),
      )

  if (action === "skip") {
    const rows = await db.update(scheduledSends)
      .set({ status: "skipped", errorMessage: "Skipped by you before sending" })
      .where(scope)
      .returning({ id: scheduledSends.id })
    const result: ApproveResult = { ok: true, action, sent: 0, deferred: 0, skipped: rows.length, failed: 0 }
    return NextResponse.json(result)
  }

  const held = await db.query.scheduledSends.findMany({ where: scope, limit: 200 })
  const style = await bodyStyleFor(gate.tenant.id)
  let budget = await remainingToday(gate.tenant.id)

  let sent = 0, deferred = 0, skipped = 0, failed = 0
  let message: string | undefined
  for (const send of held) {
    if (!send.emailSubject) {
      // Not written yet: release it and let the next run write and send it.
      await db.update(scheduledSends).set({ status: "approved" }).where(eq(scheduledSends.id, send.id))
      deferred++
      continue
    }
    const { outcome, error } = await deliverWrittenRow({ send, tenant: gate.tenant, style, budget })
    if (outcome === "sent") { budget--; sent++ }
    else if (outcome === "deferred") deferred++
    else if (outcome === "failed") { failed++; message ??= error }
    else { skipped++; message ??= error }
  }

  const result: ApproveResult = { ok: true, action, sent, deferred, skipped, failed, message }
  return NextResponse.json(result)
}
