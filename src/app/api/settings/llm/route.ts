import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, tenantUsers, tenantLlmConfig } from "@/lib/db"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { seal } from "@/lib/crypto"

// Only providers the LLM client actually speaks to. Anything else would let a
// tenant point our server at an arbitrary URL with their "key".
const Body = z.object({
  provider: z.enum(["openrouter", "openai", "anthropic", "google"]),
  model: z.string().trim().min(1).max(120).regex(/^[a-z0-9._:/-]+$/i),
  apiKey: z.string().trim().min(8).max(512).optional().or(z.literal("")),
})

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

    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Provider must be openrouter, openai, anthropic or google; model is required." }, { status: 400 })
    const { provider, model } = parsed.data
    const apiKey = parsed.data.apiKey ? seal(parsed.data.apiKey) : null

    const existing = await db.query.tenantLlmConfig.findFirst({
      where: eq(tenantLlmConfig.tenantId, tenantId),
    })

    if (existing) {
      await db.update(tenantLlmConfig)
        .set({ provider, model, ...(apiKey ? { apiKeyEncrypted: apiKey } : {}), updatedAt: new Date() })
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
