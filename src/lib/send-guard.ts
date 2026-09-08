/**
 * One send per (tenant, contact, occasion, day), enforced by the database, and a
 * first-day approval gate so a fresh account never fires a batch nobody looked at.
 */
import { db, scheduledSends, tenants } from "@/lib/db"
import { and, eq, inArray, sql } from "drizzle-orm"
import { hasAccess } from "@/lib/billing"

let guardEnsured = false

/** Unique index on the natural key. Idempotent; runs once per process. */
export async function ensureSendGuard() {
  if (guardEnsured) return
  await db.execute(sql`
    create unique index if not exists scheduled_sends_once_per_day
      on scheduled_sends (tenant_id, contact_id, occasion_type, scheduled_date)
  `)
  await db.execute(sql`alter table tenants add column if not exists postal_address text`)
  guardEnsured = true
}

/** Insert the pending row first. Returns the id, or null when today's row already exists. */
export async function claimSend(values: {
  tenantId: string; contactId: string; occasionType: string; occasionLabel: string; scheduledDate: string
}): Promise<string | null> {
  const rows = await db
    .insert(scheduledSends)
    .values({ ...values, status: "pending" })
    .onConflictDoNothing()
    .returning({ id: scheduledSends.id })
  return rows[0]?.id ?? null
}

export type TenantRow = typeof tenants.$inferSelect

/** Billing gate for the cron: never send for a tenant whose trial lapsed or whose card failed. */
export function tenantMaySend(t: TenantRow): boolean {
  return hasAccess({ subscriptionStatus: t.subscriptionStatus, trialEndsAt: t.trialEndsAt, seats: t.seats })
}

/** A tenant that has never had a note go out gets its first batch held for one click. */
export async function tenantNeedsApproval(tenantId: string): Promise<boolean> {
  const sent = await db.query.scheduledSends.findFirst({
    where: and(eq(scheduledSends.tenantId, tenantId), inArray(scheduledSends.status, ["sent"])),
    columns: { id: true },
  })
  return !sent
}
