import { auth, currentUser } from "@clerk/nextjs/server"
import { db, tenants, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"

/** Resolve the signed-in Clerk user's tenant, or null when signed out / not onboarded. */
export async function getCurrentTenant() {
  const { userId } = await auth()
  if (!userId) return null
  const tu = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  if (!tu) return null
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tu.tenantId) })
  return tenant ?? null
}

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
