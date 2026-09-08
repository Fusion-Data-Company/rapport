import { NextResponse } from "next/server"
import { z } from "zod"
import { db, tenants } from "@/lib/db"
import { eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import {
  DEFAULT_MILESTONE_MONTHS, DEFAULT_RENEWAL_LEAD_DAYS, milestoneMonthsFor, renewalLeadDaysFor,
} from "@/lib/occasions"
import { DEFAULT_TIER_DAYS, minDaysFor } from "@/lib/tiers"

export const runtime = "nodejs"

export type CadenceSettings = {
  renewalLeadDays: number
  milestoneMonths: number[]
  alwaysReview: boolean
  tierDays: { A: number; B: number; C: number }
  googleReviewUrl: string
  reviewRequestDays: number
  defaults: { renewalLeadDays: number; milestoneMonths: number[]; tierDays: { A: number; B: number; C: number } }
}

export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const body: CadenceSettings = {
    renewalLeadDays: renewalLeadDaysFor(gate.tenant),
    milestoneMonths: milestoneMonthsFor(gate.tenant),
    alwaysReview: gate.tenant.alwaysReview,
    tierDays: {
      A: minDaysFor("A", gate.tenant), B: minDaysFor("B", gate.tenant), C: minDaysFor("C", gate.tenant),
    },
    googleReviewUrl: gate.tenant.googleReviewUrl ?? "",
    reviewRequestDays: gate.tenant.reviewRequestDays,
    defaults: {
      renewalLeadDays: DEFAULT_RENEWAL_LEAD_DAYS,
      milestoneMonths: DEFAULT_MILESTONE_MONTHS,
      tierDays: DEFAULT_TIER_DAYS,
    },
  }
  return NextResponse.json(body)
}

const Body = z.object({
  renewalLeadDays: z.number().int().min(0).max(180).optional(),
  milestoneMonths: z.array(z.number().int().min(1).max(120)).max(8).optional(),
  alwaysReview: z.boolean().optional(),
  tierDays: z.object({
    A: z.number().int().min(0).max(365),
    B: z.number().int().min(0).max(365),
    C: z.number().int().min(0).max(365),
  }).partial().optional(),
  googleReviewUrl: z.string().trim().max(500).optional(),
  reviewRequestDays: z.number().int().min(0).max(365).optional(),
})

export async function PATCH(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Lead time is 0 to 180 days; milestones are up to eight months between 1 and 120." }, { status: 400 })
  }
  const link = parsed.data.googleReviewUrl
  if (link) {
    try {
      const u = new URL(link)
      if (u.protocol !== "https:") throw new Error("not https")
    } catch {
      return NextResponse.json({ error: "The review link must be a full https URL, the one Google gives you under \"Ask for reviews\"." }, { status: 400 })
    }
  }
  await ensureSchema()
  const d = parsed.data
  await db.update(tenants).set({
    ...(d.renewalLeadDays !== undefined ? { renewalLeadDays: d.renewalLeadDays } : {}),
    ...(d.milestoneMonths !== undefined
      ? { milestoneMonths: [...new Set(d.milestoneMonths)].sort((a, b) => a - b) }
      : {}),
    ...(d.alwaysReview !== undefined ? { alwaysReview: d.alwaysReview } : {}),
    ...(d.tierDays?.A !== undefined ? { tierAMinDays: d.tierDays.A } : {}),
    ...(d.tierDays?.B !== undefined ? { tierBMinDays: d.tierDays.B } : {}),
    ...(d.tierDays?.C !== undefined ? { tierCMinDays: d.tierDays.C } : {}),
    ...(d.googleReviewUrl !== undefined ? { googleReviewUrl: d.googleReviewUrl || null } : {}),
    ...(d.reviewRequestDays !== undefined ? { reviewRequestDays: d.reviewRequestDays } : {}),
    updatedAt: new Date(),
  }).where(eq(tenants.id, gate.tenant.id))
  return NextResponse.json({ ok: true })
}
