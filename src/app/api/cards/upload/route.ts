import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, cardTemplates } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import { getTenantId } from "@/lib/auth"

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

    const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"])
    const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"])
    const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 })
    }

    const ext = (file.name.split(".").pop() ?? "").toLowerCase()
    if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Allowed: jpg, jpeg, png, gif, webp, avif" }, { status: 415 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

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
