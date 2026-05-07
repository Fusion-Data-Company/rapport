import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, tenants, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Check if user already has a tenant
    const existing = await db.query.tenantUsers.findFirst({
      where: eq(tenantUsers.clerkUserId, userId),
    })
    if (existing) {
      return NextResponse.json({ tenantId: existing.tenantId })
    }

    const { businessName, fromName, fromEmail, replyTo } = await req.json()

    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + nanoid(6)

    const [tenant] = await db.insert(tenants).values({
      name: businessName,
      slug,
      businessName,
      fromEmail,
      fromName,
      replyTo: replyTo || fromEmail,
    }).returning()

    await db.insert(tenantUsers).values({
      tenantId: tenant.id,
      clerkUserId: userId,
      role: "owner",
    })

    return NextResponse.json({ tenantId: tenant.id }, { status: 201 })
  } catch (e) {
    console.error("Create tenant error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
