import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, contacts, tenantUsers } from "@/lib/db"
import { eq, and } from "drizzle-orm"

async function getTenantId(clerkUserId: string): Promise<string | null> {
  const user = await db.query.tenantUsers.findFirst({
    where: eq(tenantUsers.clerkUserId, clerkUserId),
  })
  return user?.tenantId ?? null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const { id } = await params
    const body = await req.json()

    // Strip internal fields
    const { _promptAddress, ...updateData } = body

    const [updated] = await db
      .update(contacts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)))
      .returning()

    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const { id } = await params
    await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)))
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
