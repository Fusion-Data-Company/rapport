import { NextResponse } from "next/server"
import { z } from "zod"
import { db, webhookEndpoints } from "@/lib/db"
import { eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { buildSecret, WEBHOOK_EVENTS } from "@/lib/webhooks"

export const runtime = "nodejs"

export type EndpointView = {
  id: string
  url: string
  description: string | null
  events: string[] | null
  isActive: boolean
  lastStatus: number | null
  lastError: string | null
  lastAttemptAt: string | null
  consecutiveFailures: number
  createdAt: string
}

const MAX_ENDPOINTS = 10

function view(row: typeof webhookEndpoints.$inferSelect): EndpointView {
  return {
    id: row.id, url: row.url, description: row.description, events: row.events,
    isActive: row.isActive, lastStatus: row.lastStatus, lastError: row.lastError,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    consecutiveFailures: row.consecutiveFailures,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const rows = await db.query.webhookEndpoints.findMany({
    where: eq(webhookEndpoints.tenantId, gate.tenant.id),
    orderBy: (w, { desc }) => [desc(w.createdAt)],
  })
  return NextResponse.json(rows.map(view))
}

const Body = z.object({
  url: z.string().trim().url().max(500),
  description: z.string().trim().max(120).optional().nullable().transform((v) => (v ? v : null)),
  events: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
})

/** Add an endpoint. The signing secret is returned once and never again. */
export async function POST(req: Request) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Give a full https URL to post to." }, { status: 400 })
  const url = new URL(parsed.data.url)
  if (url.protocol !== "https:") {
    return NextResponse.json({ error: "The URL must be https, so the payload cannot be read in transit." }, { status: 400 })
  }

  const existing = await db.query.webhookEndpoints.findMany({
    where: eq(webhookEndpoints.tenantId, gate.tenant.id), columns: { id: true },
  })
  if (existing.length >= MAX_ENDPOINTS) {
    return NextResponse.json({ error: `You can have ${MAX_ENDPOINTS} endpoints.` }, { status: 400 })
  }

  const { secret, sealed } = buildSecret()
  const [row] = await db.insert(webhookEndpoints).values({
    tenantId: gate.tenant.id,
    url: parsed.data.url,
    description: parsed.data.description,
    events: parsed.data.events?.length ? parsed.data.events : null,
    secretEncrypted: sealed,
  }).returning()

  // The only time the secret is ever readable.
  return NextResponse.json({ ...view(row), secret }, { status: 201 })
}
