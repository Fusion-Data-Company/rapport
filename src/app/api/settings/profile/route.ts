import { NextResponse } from "next/server"
import { z } from "zod"
import { db, tenants } from "@/lib/db"
import { eq } from "drizzle-orm"
import { currentTenant } from "@/lib/tenant"

const Body = z.object({
  businessName: z.string().trim().min(1).max(120).optional(),
  fromName: z.string().trim().min(1).max(120).optional(),
  replyTo: z.string().trim().email().max(320).optional().or(z.literal("")),
  postalAddress: z.string().trim().max(240).optional().or(z.literal("")),
  timezone: z.string().trim().max(64).optional(),
})

export async function GET() {
  const t = await currentTenant()
  if (!t) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({
    businessName: t.businessName, fromName: t.fromName, fromEmail: t.fromEmail, replyTo: t.replyTo,
    postalAddress: t.postalAddress ?? "", timezone: t.timezone,
    subscriptionStatus: t.subscriptionStatus, seats: t.seats, trialEndsAt: t.trialEndsAt,
  })
}

export async function PATCH(req: Request) {
  const t = await currentTenant()
  if (!t) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Check the fields and try again." }, { status: 400 })
  const d = parsed.data
  await db.update(tenants).set({
    ...(d.businessName !== undefined ? { businessName: d.businessName, name: d.businessName } : {}),
    ...(d.fromName !== undefined ? { fromName: d.fromName } : {}),
    ...(d.replyTo !== undefined ? { replyTo: d.replyTo || t.fromEmail } : {}),
    ...(d.postalAddress !== undefined ? { postalAddress: d.postalAddress || null } : {}),
    ...(d.timezone !== undefined ? { timezone: d.timezone } : {}),
  }).where(eq(tenants.id, t.id))
  return NextResponse.json({ ok: true })
}
