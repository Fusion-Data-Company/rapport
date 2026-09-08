import { auth, currentUser } from "@clerk/nextjs/server"
import { db, tenants, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"
import { hasAccess } from "@/lib/billing"

export type TenantRow = typeof tenants.$inferSelect

/** Resolve the signed-in Clerk user's tenant, or null when signed out / not onboarded. */
export async function getCurrentTenant(): Promise<TenantRow | null> {
  const { userId } = await auth()
  if (!userId) return null
  const tu = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  if (!tu) return null
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tu.tenantId) })
  return tenant ?? null
}
export const currentTenant = getCurrentTenant

export async function getCurrentUserEmail(): Promise<string | undefined> {
  const user = await currentUser()
  return user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress
}

/** Base URL for absolute redirects (Stripe success/cancel, unsubscribe links). */
export function appUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  return raw.replace(/\/+$/, "")
}

export type Gate =
  | { ok: true; tenant: TenantRow }
  | { ok: false; status: 401 | 402 | 400; error: string }

/** Signed in, has a tenant, and the tenant may use the app (active, or trial not expired). */
export async function requireAccess(): Promise<Gate> {
  const { userId } = await auth()
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" }
  const tenant = await getCurrentTenant()
  if (!tenant) return { ok: false, status: 400, error: "No tenant" }
  if (!hasAccess({ subscriptionStatus: tenant.subscriptionStatus, trialEndsAt: tenant.trialEndsAt, seats: tenant.seats })) {
    return { ok: false, status: 402, error: "Your trial has ended or the subscription is not active. Open Settings, Billing." }
  }
  return { ok: true, tenant }
}
