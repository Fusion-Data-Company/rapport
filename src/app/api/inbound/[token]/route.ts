import { NextResponse } from "next/server"
import { z } from "zod"
import { db, contactDates, contacts, tenants } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { ensureSchema } from "@/lib/db/ensure"
import { parseDateInput } from "@/lib/dates"
import { normalizeTier } from "@/lib/tier-labels"

export const runtime = "nodejs"

/**
 * Contacts, in.
 *
 * The path an AMS or a CRM actually has: an export, a Zapier zap, or a "post to a
 * URL" action. One endpoint, one per-tenant token, and the same column names the
 * CSV importer understands, so an EZLynx or Follow Up Boss field map made once
 * works for both routes.
 *
 * Accepts JSON (one object or an array) or a form post. Matching is on external_id
 * first and then email, so a system that re-sends a record updates it instead of
 * making a second copy.
 */

const MAX_ROWS = 500

const Row = z.object({
  external_id: z.string().trim().max(120).optional(),
  first_name: z.string().trim().max(80).optional(),
  last_name: z.string().trim().max(80).optional(),
  name: z.string().trim().max(160).optional(),
  email: z.string().trim().max(320).optional(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  title: z.string().trim().max(120).optional(),
  tier: z.string().trim().max(4).optional(),
  birthdate: z.string().trim().max(40).optional(),
  anniversary: z.string().trim().max(40).optional(),
  policy_renewal_date: z.string().trim().max(40).optional(),
  policy_type: z.string().trim().max(80).optional(),
  loan_closed_date: z.string().trim().max(40).optional(),
  loan_type: z.string().trim().max(80).optional(),
  home_purchase_date: z.string().trim().max(40).optional(),
  custom_date: z.string().trim().max(40).optional(),
  custom_date_label: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(40).optional(),
  zip: z.string().trim().max(20).optional(),
  spouse_name: z.string().trim().max(120).optional(),
  hometown: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(4000).optional(),
  source: z.string().trim().max(40).optional(),
}).passthrough()

type RowT = z.infer<typeof Row>

function names(r: RowT): { firstName: string; lastName: string | null } {
  if (r.first_name) return { firstName: r.first_name, lastName: r.last_name ?? null }
  const parts = (r.name ?? "").trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? "Unknown", lastName: parts.slice(1).join(" ") || null }
}

function fields(r: RowT, tenantId: string) {
  const { firstName, lastName } = names(r)
  return {
    tenantId,
    firstName,
    lastName,
    email: r.email?.toLowerCase() || null,
    phone: r.phone || null,
    companyName: r.company || null,
    jobTitle: r.title || null,
    tier: normalizeTier(r.tier),
    birthdate: parseDateInput(r.birthdate),
    anniversary: parseDateInput(r.anniversary),
    policyRenewalDate: parseDateInput(r.policy_renewal_date),
    policyType: r.policy_type || null,
    loanClosedDate: parseDateInput(r.loan_closed_date),
    loanType: r.loan_type || null,
    homePurchaseDate: parseDateInput(r.home_purchase_date),
    city: r.city || null,
    state: r.state || null,
    zip: r.zip || null,
    spouseName: r.spouse_name || null,
    placeHometown: r.hometown || null,
    internalNotes: r.notes || null,
    externalId: r.external_id || null,
    source: (r.source || "inbound").slice(0, 40),
  }
}

async function readRows(req: Request): Promise<unknown[]> {
  const type = req.headers.get("content-type") ?? ""
  if (type.includes("application/json")) {
    const json = await req.json().catch(() => null)
    if (Array.isArray(json)) return json
    if (json && typeof json === "object") {
      // Zapier and several AMS exports wrap the list.
      const wrapped = (json as Record<string, unknown>).contacts ?? (json as Record<string, unknown>).data
      if (Array.isArray(wrapped)) return wrapped
      return [json]
    }
    return []
  }
  const form = await req.formData().catch(() => null)
  if (!form) return []
  return [Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]))]
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (!token || token.length < 16) return NextResponse.json({ error: "Unknown inbound URL" }, { status: 404 })
  await ensureSchema()

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.inboundToken, token) })
  if (!tenant) return NextResponse.json({ error: "Unknown inbound URL" }, { status: 404 })

  const raw = await readRows(req)
  if (raw.length === 0) return NextResponse.json({ error: "No contacts in the request body." }, { status: 400 })
  if (raw.length > MAX_ROWS) return NextResponse.json({ error: `Send at most ${MAX_ROWS} contacts per request.` }, { status: 400 })

  let created = 0, updated = 0, rejected = 0
  for (const item of raw) {
    const parsed = Row.safeParse(item)
    if (!parsed.success) { rejected++; continue }
    const r = parsed.data
    const values = fields(r, tenant.id)
    if (values.firstName === "Unknown" && !values.email) { rejected++; continue }

    const existing = r.external_id
      ? await db.query.contacts.findFirst({ where: and(eq(contacts.tenantId, tenant.id), eq(contacts.externalId, r.external_id)) })
      : values.email
        ? await db.query.contacts.findFirst({ where: and(eq(contacts.tenantId, tenant.id), eq(contacts.email, values.email)) })
        : undefined

    // Only overwrite with something: a partial export must not blank a filled field.
    const patch = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== undefined))

    if (existing) {
      await db.update(contacts).set({ ...patch, updatedAt: new Date() }).where(eq(contacts.id, existing.id))
      updated++
      await addCustomDate(tenant.id, existing.id, r)
    } else {
      const [row] = await db.insert(contacts).values(values).returning({ id: contacts.id })
      created++
      if (row) await addCustomDate(tenant.id, row.id, r)
    }
  }

  return NextResponse.json({ ok: true, created, updated, rejected })
}

async function addCustomDate(tenantId: string, contactId: string, r: RowT) {
  const date = parseDateInput(r.custom_date)
  const label = r.custom_date_label?.trim()
  if (!date || !label) return
  const already = await db.query.contactDates.findFirst({
    where: and(eq(contactDates.contactId, contactId), eq(contactDates.label, label)),
    columns: { id: true },
  })
  if (already) return
  await db.insert(contactDates).values({ tenantId, contactId, label, date, recurrence: "annual" }).catch(() => undefined)
}
