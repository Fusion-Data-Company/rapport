import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, cardTemplates, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

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

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const occasionType = formData.get("occasionType") as string | null

    if (!file || !occasionType) {
      return NextResponse.json({ error: "Missing file or occasionType" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads", "cards")

    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)

    const imageUrl = `/uploads/cards/${filename}`
    const name = file.name.replace(/\.[^.]+$/, "")

    const [card] = await db
      .insert(cardTemplates)
      .values({ tenantId, occasionType, name, imageUrl, isSystem: false, isActive: true })
      .returning()

    return NextResponse.json(card, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
