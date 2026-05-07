import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, contacts, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"

async function getTenantId(clerkUserId: string): Promise<string | null> {
  const user = await db.query.tenantUsers.findFirst({
    where: eq(tenantUsers.clerkUserId, clerkUserId),
  })
  return user?.tenantId ?? null
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const rows = await db.query.contacts.findMany({
      where: eq(contacts.tenantId, tenantId),
      with: { children: true, sportsTeams: true },
      orderBy: (c: any, { desc }: any) => [desc(c.createdAt)],
    })

    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const body = await req.json()
    const [contact] = await db.insert(contacts).values({ ...body, tenantId }).returning()
    return NextResponse.json(contact, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
