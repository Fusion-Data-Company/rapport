import { db, contacts } from "@/lib/db"
import { eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"

const COLS = ["firstName", "lastName", "nickname", "email", "phone", "birthdate", "anniversary", "spouseName", "companyName", "jobTitle", "city", "state", "zip", "placeHometown", "college", "hobbies", "carType", "internalNotes", "status", "unsubscribed", "createdAt"] as const

function cell(v: unknown): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s // never let a cell execute in a spreadsheet
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Your book, as a CSV. The landing page promises this; here it is. */
export async function GET() {
  const gate = await requireAccess()
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status })
  const rows = await db.query.contacts.findMany({ where: eq(contacts.tenantId, gate.tenant.id), orderBy: (c, { asc }) => [asc(c.lastName), asc(c.firstName)] })
  const lines = [COLS.join(","), ...rows.map((r) => COLS.map((c) => cell((r as Record<string, unknown>)[c])).join(","))]
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="rapport-contacts-${new Date().toISOString().slice(0, 10)}.csv"` },
  })
}
