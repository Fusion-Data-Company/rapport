import { NextResponse } from "next/server"
import { db, tenants } from "@/lib/db"
import { eq } from "drizzle-orm"
import { appUrl, requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { newInboundToken } from "@/lib/webhooks"

export const runtime = "nodejs"

export type InboundSettings = { url: string }

async function tokenFor(tenantId: string, existing: string | null): Promise<string> {
  if (existing) return existing
  const token = newInboundToken()
  await db.update(tenants).set({ inboundToken: token }).where(eq(tenants.id, tenantId))
  return token
}

/** The URL an AMS, CRM or Zapier posts contacts to. Created on first read. */
export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const token = await tokenFor(gate.tenant.id, gate.tenant.inboundToken)
  const body: InboundSettings = { url: `${appUrl()}/api/inbound/${token}` }
  return NextResponse.json(body)
}

/** Roll the token. The old URL stops working immediately. */
export async function POST() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const token = newInboundToken()
  await db.update(tenants).set({ inboundToken: token }).where(eq(tenants.id, gate.tenant.id))
  const body: InboundSettings = { url: `${appUrl()}/api/inbound/${token}` }
  return NextResponse.json(body)
}
