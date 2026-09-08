import { NextResponse } from "next/server"
import { z } from "zod"
import { db, contacts, contactTimeline } from "@/lib/db"
import { and, desc, eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { TIMELINE_KINDS } from "@/lib/timeline"

export const runtime = "nodejs"

const PAGE = 50

/** The interaction history for one contact, newest first. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const { id } = await ctx.params
  const rows = await db.query.contactTimeline.findMany({
    where: and(eq(contactTimeline.contactId, id), eq(contactTimeline.tenantId, gate.tenant.id)),
    orderBy: [desc(contactTimeline.occurredAt), desc(contactTimeline.createdAt)],
    limit: PAGE,
  })
  return NextResponse.json(rows)
}

const Body = z.object({
  kind: z.enum(TIMELINE_KINDS).default("note"),
  body: z.string().trim().min(1).max(4000),
  summary: z.string().trim().max(200).optional().nullable().transform((v) => (v ? v : null)),
  occurredAt: z.string().datetime().optional(),
})

/** Log a note, a call, or a reply the contact sent back. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const { id } = await ctx.params

  const owned = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.tenantId, gate.tenant.id)),
    columns: { id: true },
  })
  if (!owned) return NextResponse.json({ error: "Contact not found" }, { status: 404 })

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Write something first." }, { status: 400 })

  const [row] = await db.insert(contactTimeline).values({
    contactId: id,
    tenantId: gate.tenant.id,
    kind: parsed.data.kind,
    summary: parsed.data.summary,
    body: parsed.data.body,
    occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
    source: "manual",
  }).returning()
  return NextResponse.json(row, { status: 201 })
}
