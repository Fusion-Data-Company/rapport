import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, contacts, scheduledSends, tenantUsers, sportsNotificationsSent } from "@/lib/db"
import { eq, and, gte, sql } from "drizzle-orm"

async function getTenantId(clerkUserId: string): Promise<string | null> {
  const user = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, clerkUserId) })
  return user?.tenantId ?? null
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({})

    const startOfMonth = new Date()
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)

    const [totalContacts] = await db.select({ count: sql<number>`count(*)` })
      .from(contacts).where(and(eq(contacts.tenantId, tenantId), eq(contacts.status, "active")))

    const [sentThisMonth] = await db.select({ count: sql<number>`count(*)` })
      .from(scheduledSends)
      .where(and(eq(scheduledSends.tenantId, tenantId), eq(scheduledSends.status, "sent"), gte(scheduledSends.sentAt!, startOfMonth)))

    const [openedThisMonth] = await db.select({ count: sql<number>`count(*)` })
      .from(scheduledSends)
      .where(and(eq(scheduledSends.tenantId, tenantId), sql`${scheduledSends.openedAt} IS NOT NULL`, gte(scheduledSends.sentAt!, startOfMonth)))

    const [sportsAlerts] = await db.select({ count: sql<number>`count(*)` })
      .from(sportsNotificationsSent)
      .where(and(eq(sportsNotificationsSent.tenantId, tenantId), gte(sportsNotificationsSent.sentAt, startOfMonth)))

    const sentCount = Number(sentThisMonth.count)
    const openedCount = Number(openedThisMonth.count)

    return NextResponse.json({
      totalContacts: Number(totalContacts.count),
      sentThisMonth: sentCount,
      openRate: sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : 0,
      sportsAlerts: Number(sportsAlerts.count),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({})
  }
}
