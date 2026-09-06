import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { db, tenants, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"
import AppShell from "@/components/layout/AppShell"
import { hasAccess } from "@/lib/billing"
import BillingWall from "@/components/billing/BillingWall"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  // Check if user has completed onboarding (has a tenant)
  const tenantUser = await db.query.tenantUsers.findFirst({
    where: eq(tenantUsers.clerkUserId, userId),
  })
  if (!tenantUser) redirect("/onboarding")

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantUser.tenantId) })
  if (!tenant) redirect("/onboarding")

  // Billing gate: expired trial or non-active subscription → show the paywall instead of the app.
  // The /billing and /settings/billing routes stay reachable so the user can pay or manage billing.
  const pathname = (await headers()).get("x-pathname") ?? ""
  const isBillingRoute = pathname.startsWith("/billing") || pathname.startsWith("/settings/billing")
  if (!hasAccess(tenant) && !isBillingRoute) {
    return (
      <AppShell plan={tenant.plan} subscriptionStatus={tenant.subscriptionStatus}>
        <BillingWall
          seats={tenant.seats}
          subscriptionStatus={tenant.subscriptionStatus}
          trialEndsAt={tenant.trialEndsAt?.toISOString() ?? null}
        />
      </AppShell>
    )
  }

  return (
    <AppShell plan={tenant.plan} subscriptionStatus={tenant.subscriptionStatus} trialEndsAt={tenant.trialEndsAt?.toISOString() ?? null}>
      {children}
    </AppShell>
  )
}
