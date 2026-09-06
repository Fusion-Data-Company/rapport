import { redirect } from "next/navigation"
import { getCurrentTenant } from "@/lib/tenant"
import BillingWall from "@/components/billing/BillingWall"

export default async function BillingPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect("/onboarding")
  return (
    <BillingWall
      seats={tenant.seats}
      subscriptionStatus={tenant.subscriptionStatus}
      trialEndsAt={tenant.trialEndsAt?.toISOString() ?? null}
    />
  )
}
