import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, tenants, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"
import { sendMail, NoMailerError } from "@/lib/mailer"
import { getCurrentUserEmail } from "@/lib/tenant"

/** Send a test note to the signed-in user through whatever mailer resolves for the tenant. */
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tu = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
    if (!tu) return NextResponse.json({ error: "No tenant" }, { status: 400 })
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tu.tenantId) })
    const to = await getCurrentUserEmail()
    if (!tenant || !to) return NextResponse.json({ error: "No email on your account" }, { status: 400 })

    await sendMail(tenant.id, {
      from: `${tenant.fromName} <${tenant.fromEmail}>`,
      to,
      subject: `Rapport is connected for ${tenant.businessName}`,
      text: `This is a test from Rapport. Milestone and sports emails for ${tenant.businessName} will go out from ${tenant.fromEmail}.`,
      html: `<p>This is a test from <b>Rapport</b>.</p><p>Milestone and sports emails for ${tenant.businessName} will go out from ${tenant.fromEmail}.</p>`,
    })
    return NextResponse.json({ ok: true, to })
  } catch (e) {
    if (e instanceof NoMailerError) return NextResponse.json({ error: e.message }, { status: 409 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Send failed" }, { status: 502 })
  }
}
