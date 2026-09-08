import { NextResponse } from "next/server"
import { db, tenantEmailConfig } from "@/lib/db"
import { eq } from "drizzle-orm"
import { requireAccess } from "@/lib/tenant"
import { ensureSchema } from "@/lib/db/ensure"
import { mailboxSummary } from "@/lib/mailer"
import { checkDomain } from "@/lib/dns-check"

export const runtime = "nodejs"
export const maxDuration = 30

/** Run the SPF / DKIM / DMARC check for the connected mailbox's domain and store the result. */
export async function POST() {
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await ensureSchema()

  const cfg = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, gate.tenant.id) })
  const summary = mailboxSummary(cfg)
  const address = summary.address ?? gate.tenant.fromEmail
  const report = await checkDomain(address, summary.kind)
  if (!report) {
    return NextResponse.json({ error: "Connect a mailbox first; the check runs against the domain your notes send from." }, { status: 400 })
  }

  if (cfg) {
    await db.update(tenantEmailConfig).set({
      spfStatus: report.spf.status, dkimStatus: report.dkim.status, dmarcStatus: report.dmarc.status,
      dnsDetail: report, dnsCheckedAt: new Date(), updatedAt: new Date(),
    }).where(eq(tenantEmailConfig.tenantId, gate.tenant.id))
  }
  return NextResponse.json({ ...report, stale: false })
}
