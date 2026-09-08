import { NextResponse } from "next/server"
import { z } from "zod"
import { db, tenants } from "@/lib/db"
import { eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import {
  DEFAULT_MILESTONE_MONTHS, DEFAULT_RENEWAL_LEAD_DAYS, milestoneMonthsFor, renewalLeadDaysFor,
} from "@/lib/occasions"

export const runtime = "nodejs"

export type CadenceSettings = {
  renewalLeadDays: number
  milestoneMonths: number[]
  defaults: { renewalLeadDays: number; milestoneMonths: number[] }
}

export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const body: CadenceSettings = {
    renewalLeadDays: renewalLeadDaysFor(gate.tenant),
    milestoneMonths: milestoneMonthsFor(gate.tenant),
    defaults: { renewalLeadDays: DEFAULT_RENEWAL_LEAD_DAYS, milestoneMonths: DEFAULT_MILESTONE_MONTHS },
  }
  return NextResponse.json(body)
}

const Body = z.object({
  renewalLeadDays: z.number().int().min(0).max(180).optional(),
  milestoneMonths: z.array(z.number().int().min(1).max(120)).max(8).optional(),
})

export async function PATCH(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Lead time is 0 to 180 days; milestones are up to eight months between 1 and 120." }, { status: 400 })
  }
  await ensureSchema()
  const d = parsed.data
  await db.update(tenants).set({
    ...(d.renewalLeadDays !== undefined ? { renewalLeadDays: d.renewalLeadDays } : {}),
    ...(d.milestoneMonths !== undefined
      ? { milestoneMonths: [...new Set(d.milestoneMonths)].sort((a, b) => a - b) }
      : {}),
    updatedAt: new Date(),
  }).where(eq(tenants.id, gate.tenant.id))
  return NextResponse.json({ ok: true })
}
