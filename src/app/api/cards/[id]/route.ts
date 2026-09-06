import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { del } from "@vercel/blob"
import { db, cardTemplates } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { getCurrentTenant } from "@/lib/tenant"

export const runtime = "nodejs"

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 })

  const { id } = await ctx.params
  const card = await db.query.cardTemplates.findFirst({
    where: and(eq(cardTemplates.id, id), eq(cardTemplates.tenantId, tenant.id), eq(cardTemplates.isSystem, false)),
  })
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Soft-delete first so scheduled_sends.card_template_id FKs stay valid; then try to remove the blob.
  await db.update(cardTemplates).set({ isActive: false }).where(eq(cardTemplates.id, id))
  if (process.env.BLOB_READ_WRITE_TOKEN && card.imageUrl.includes(".blob.vercel-storage.com")) {
    try { await del(card.imageUrl) } catch (e) { console.warn("Blob delete failed:", e) }
  }
  return NextResponse.json({ ok: true })
}
