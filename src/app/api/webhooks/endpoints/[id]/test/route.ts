import { NextResponse } from "next/server"
import { db, webhookEndpoints } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { deliverOnce, type NotePayload } from "@/lib/webhooks"

export const runtime = "nodejs"
export const maxDuration = 30

/** Post a sample note.sent payload so the agent can map it in Zapier before a real one fires. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { id } = await ctx.params
  const ep = await db.query.webhookEndpoints.findFirst({
    where: and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.tenantId, gate.tenant.id)),
  })
  if (!ep) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const today = new Date().toISOString().slice(0, 10)
  const sample: NotePayload = {
    event: "note.sent",
    id: "00000000-0000-0000-0000-000000000000",
    created_at: new Date().toISOString(),
    tenant_id: gate.tenant.id,
    business_name: gate.tenant.businessName,
    contact_id: "00000000-0000-0000-0000-000000000001",
    contact_first_name: "Sample",
    contact_last_name: "Contact",
    contact_email: "sample@example.com",
    contact_company: "Example Roofing",
    contact_tier: "B",
    occasion: "policy_renewal",
    occasion_label: "Policy renews in 30 days",
    subject: "Quick note before your renewal",
    body: "Sample, your policy comes up next month. Happy to take a look together before it does.",
    scheduled_date: today,
    sent_at: new Date().toISOString(),
    error: null,
  }

  const result = await deliverOnce(ep, "note.sent", sample)
  return NextResponse.json(result)
}
