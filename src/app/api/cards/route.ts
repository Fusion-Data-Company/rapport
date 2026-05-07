import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, cardTemplates, tenantUsers } from "@/lib/db"
import { eq, and, or, isNull } from "drizzle-orm"

async function getTenantId(userId: string) {
  const u = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  return u?.tenantId ?? null
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json([])

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json([])

    const { searchParams } = new URL(req.url)
    const occasion = searchParams.get("occasion")

    const cards = await db.query.cardTemplates.findMany({
      where: and(
        eq(cardTemplates.isActive, true),
        occasion ? eq(cardTemplates.occasionType, occasion) : undefined,
        or(eq(cardTemplates.tenantId, tenantId), isNull(cardTemplates.tenantId)),
      ),
    })

    return NextResponse.json(cards)
  } catch (e) {
    return NextResponse.json([])
  }
}
