import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { put } from "@vercel/blob"
import { db, cardTemplates } from "@/lib/db"
import { getCurrentTenant } from "@/lib/tenant"

export const runtime = "nodejs"

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 })
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Card uploads are not configured (BLOB_READ_WRITE_TOKEN missing)" }, { status: 503 })
  }

  const form = await req.formData()
  const file = form.get("file")
  const occasionType = String(form.get("occasionType") ?? "").trim()
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 })
  if (!occasionType) return NextResponse.json({ error: "occasionType is required" }, { status: 400 })
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only images are allowed" }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const blob = await put(`cards/${tenant.id}/${occasionType}/${Date.now()}-${safeName}`, file, {
    access: "public",
    contentType: file.type,
  })

  const [card] = await db.insert(cardTemplates).values({
    tenantId: tenant.id,
    occasionType,
    name: file.name.replace(/\.[^.]+$/, ""),
    imageUrl: blob.url,
    isSystem: false,
    isActive: true,
  }).returning()

  return NextResponse.json(card, { status: 201 })
}
