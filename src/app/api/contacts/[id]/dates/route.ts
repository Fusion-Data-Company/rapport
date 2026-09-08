import { NextResponse } from "next/server"
import { z } from "zod"
import { db, contactDates, contacts } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"

export const runtime = "nodejs"

const Body = z.object({
  label: z.string().trim().min(1).max(80),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  recurrence: z.enum(["annual", "once"]).default("annual"),
  notes: z.string().trim().max(500).optional().nullable().transform((v) => (v ? v : null)),
})

/** Every custom date on one contact. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()
  const { id } = await ctx.params
  const rows = await db.query.contactDates.findMany({
    where: and(eq(contactDates.contactId, id), eq(contactDates.tenantId, gate.tenant.id)),
    orderBy: (d, { asc }) => [asc(d.date)],
  })
  return NextResponse.json(rows)
}

const MAX_PER_CONTACT = 20

/** Add a date this contact should be remembered on. */
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
  if (!parsed.success) {
    return NextResponse.json({ error: "A label and a date in YYYY-MM-DD form are both required." }, { status: 400 })
  }

  const existing = await db.query.contactDates.findMany({
    where: eq(contactDates.contactId, id), columns: { id: true },
  })
  if (existing.length >= MAX_PER_CONTACT) {
    return NextResponse.json({ error: `A contact can carry ${MAX_PER_CONTACT} custom dates.` }, { status: 400 })
  }

  const [row] = await db.insert(contactDates)
    .values({ ...parsed.data, contactId: id, tenantId: gate.tenant.id })
    .returning()
  return NextResponse.json(row, { status: 201 })
}
