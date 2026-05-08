import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, cardTemplates } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { getTenantId } from "@/lib/auth"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const { id } = await params

    const card = await db.query.cardTemplates.findFirst({
      where: and(eq(cardTemplates.id, id), eq(cardTemplates.tenantId, tenantId)),
    })

    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (card.isSystem) return NextResponse.json({ error: "Cannot delete system cards" }, { status: 403 })

    await db
      .delete(cardTemplates)
      .where(and(eq(cardTemplates.id, id), eq(cardTemplates.tenantId, tenantId)))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
