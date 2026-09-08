import { NextResponse } from "next/server"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { allowanceFor, PAID_PLANS, type Allowance, type Plan } from "@/lib/tiers"

export const runtime = "nodejs"

export type PlanStatus = Allowance & { plans: Plan[] }

/** Where the book stands against the plan. Informational: nothing here blocks anything. */
export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const allowance = await allowanceFor(gate.tenant)
  const body: PlanStatus = { ...allowance, plans: PAID_PLANS }
  return NextResponse.json(body)
}
