import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, tenants, tenantUsers, tenantEmailConfig } from "@/lib/db"
import { eq } from "drizzle-orm"
import { driverFromConfig, platformDriver, verifySmtp } from "@/lib/mailer"

async function getTenantId(userId: string) {
  const u = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  return u?.tenantId ?? null
}

/** Current mailbox status (never returns the password). */
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = await getTenantId(userId)
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })
  const cfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, tenantId) })
  const own = driverFromConfig(cfg)
  return NextResponse.json({
    connected: !!own,
    platformFallback: !own && !!platformDriver(),
    host: cfg?.smtpHost ?? null,
    port: cfg?.smtpPort ?? null,
    username: cfg?.smtpUsername ?? null,
    verified: cfg?.isVerified ?? false,
  })
}

/** Save SMTP credentials after verifying them against the server. */
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const host = String(body.host ?? "").trim()
    const port = Number(body.port ?? 587)
    const username = String(body.username ?? "").trim()
    const password = String(body.password ?? "")
    if (!host || !username || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
      return NextResponse.json({ error: "Host, port, username and password are all required." }, { status: 400 })
    }

    const err = await verifySmtp({ host, port, user: username, pass: password })
    if (err) return NextResponse.json({ error: `Could not sign in to that mailbox: ${err}` }, { status: 400 })

    const values = {
      provider: "smtp", smtpHost: host, smtpPort: port, smtpUsername: username,
      smtpPasswordEncrypted: password, apiKeyEncrypted: null, isVerified: true, updatedAt: new Date(),
    }
    const existing = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, tenantId) })
    if (existing) await db.update(tenantEmailConfig).set(values).where(eq(tenantEmailConfig.tenantId, tenantId))
    else await db.insert(tenantEmailConfig).values({ tenantId, ...values })

    // The rep's mailbox is the sender: default the tenant's from-address to it when none is set.
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
    if (tenant && (!tenant.fromEmail || tenant.fromEmail.endsWith("@example.com")) && username.includes("@")) {
      await db.update(tenants).set({ fromEmail: username }).where(eq(tenants.id, tenantId))
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/** Disconnect the mailbox. */
export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = await getTenantId(userId)
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })
  await db.delete(tenantEmailConfig).where(eq(tenantEmailConfig.tenantId, tenantId))
  return NextResponse.json({ ok: true })
}
