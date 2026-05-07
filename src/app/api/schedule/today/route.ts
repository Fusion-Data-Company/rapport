import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, scheduledSends, tenantUsers, contacts } from "@/lib/db"
import { eq, and } from "drizzle-orm"

async function getTenantId(userId: string) {
  const u = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  return u?.tenantId ?? null
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json([])

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json([])

    const today = new Date().toISOString().split("T")[0]

    const sends = await db.query.scheduledSends.findMany({
      where: and(eq(scheduledSends.tenantId, tenantId), eq(scheduledSends.scheduledDate, today)),
      with: { contact: true },
    })

    return NextResponse.json(sends.map(s => ({
      ...s,
      contactFirstName: (s as any).contact?.firstName,
      contactLastName: (s as any).contact?.lastName,
    })))
  } catch (e) {
    return NextResponse.json([])
  }
}
