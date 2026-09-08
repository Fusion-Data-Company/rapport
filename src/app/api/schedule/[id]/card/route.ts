import { NextResponse } from "next/server"
import { z } from "zod"
import { db, contacts, scheduledSends } from "@/lib/db"
import { and, eq, inArray } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { cardForNote } from "@/lib/deliver"
import { cardGenerationConfigured } from "@/lib/card-image"

export const runtime = "nodejs"
export const maxDuration = 120

const Body = z.object({
  /** The sender's own line. It steers the artwork; the printed line stays the
   *  occasion line with the contact's name in it, because two lines of generated
   *  type is where the spelling breaks. */
  note: z.string().trim().max(160).optional(),
})

/**
 * Make this note's card again, with the sender's line folded into the brief.
 *
 * Always answers with a card. When no generation provider is configured the reply is
 * the occasion's system card and `source: "system"`, so the queue can say plainly
 * where the picture came from instead of showing an empty frame.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()

  const { id } = await ctx.params
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "That line is too long for a card. Keep it under 160 characters." }, { status: 400 })
  }
  const note = parsed.data.note?.trim() || null

  const send = await db.query.scheduledSends.findFirst({
    where: and(eq(scheduledSends.id, id), eq(scheduledSends.tenantId, gate.tenant.id)),
  })
  if (!send) return NextResponse.json({ error: "No such note." }, { status: 404 })
  if (!["pending_approval", "approved", "deferred", "pending"].includes(send.status)) {
    return NextResponse.json({ error: "That note has already gone out, so its card cannot be changed." }, { status: 409 })
  }

  const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, send.contactId) })
  const name = contact?.nickname?.trim() || contact?.firstName || "Friend"

  const card = await cardForNote({
    tenantId: gate.tenant.id,
    occasion: send.occasionType,
    name,
    senderLine: note,
  })

  const [row] = await db.update(scheduledSends)
    .set({
      cardNote: note,
      cardImageUrl: card.imageUrl,
      cardSource: card.source,
      cardTemplateId: card.templateId,
    })
    .where(and(
      eq(scheduledSends.id, id),
      eq(scheduledSends.tenantId, gate.tenant.id),
      inArray(scheduledSends.status, ["pending_approval", "approved", "deferred", "pending"]),
    ))
    .returning()

  if (!row) {
    return NextResponse.json({ error: "That note has already gone out, so its card cannot be changed." }, { status: 409 })
  }

  return NextResponse.json({
    cardImageUrl: row.cardImageUrl,
    cardSource: row.cardSource,
    cardNote: row.cardNote,
    cardLine: card.line,
    generationConfigured: cardGenerationConfigured(),
    error: card.error ?? null,
  })
}
