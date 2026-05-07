import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, tenantUsers, tenantLlmConfig } from "@/lib/db"
import { eq } from "drizzle-orm"

async function getTenantId(userId: string) {
  const u = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  return u?.tenantId ?? null
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const { provider, model, apiKey } = await req.json()

    const existing = await db.query.tenantLlmConfig.findFirst({
      where: eq(tenantLlmConfig.tenantId, tenantId),
    })

    if (existing) {
      await db.update(tenantLlmConfig)
        .set({ provider, model, apiKeyEncrypted: apiKey, updatedAt: new Date() })
        .where(eq(tenantLlmConfig.tenantId, tenantId))
    } else {
      await db.insert(tenantLlmConfig).values({
        tenantId, provider, model, apiKeyEncrypted: apiKey,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
