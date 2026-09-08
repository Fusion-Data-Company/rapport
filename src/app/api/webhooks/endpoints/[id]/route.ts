import { NextResponse } from "next/server"
import { z } from "zod"
import { db, webhookEndpoints } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"

export const runtime = "nodejs"

const Body = z.object({ isActive: z.boolean() })

/** Pause or resume an endpoint. Resuming clears the failure count. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { id } = await ctx.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Nothing to change." }, { status: 400 })

  const rows = await db.update(webhookEndpoints)
    .set({ isActive: parsed.data.isActive, ...(parsed.data.isActive ? { consecutiveFailures: 0, lastError: null } : {}) })
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.tenantId, gate.tenant.id)))
    .returning({ id: webhookEndpoints.id })
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { id } = await ctx.params
  const rows = await db.delete(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.tenantId, gate.tenant.id)))
    .returning({ id: webhookEndpoints.id })
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
