import Link from "next/link"
import { redirect } from "next/navigation"
import { CreditCard } from "lucide-react"
import { getCurrentTenant } from "@/lib/tenant"
import { hasAccess, PRICE_PER_SEAT_USD } from "@/lib/billing"
import { allowanceFor } from "@/lib/tiers"
import { daysUntil } from "@/lib/billing-ui"
import { GlassCard } from "@/components/ui/glass-card"
import ManageBillingButton from "@/components/billing/ManageBillingButton"

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Free trial",
  past_due: "Past due",
  unpaid: "Unpaid",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  paused: "Paused",
}

export default async function BillingSettingsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const tenant = await getCurrentTenant()
  if (!tenant) redirect("/onboarding")
  const { checkout } = await searchParams

  const status = tenant.subscriptionStatus
  const subscribed = !!tenant.stripeSubscriptionId && status === "active"
  const trialActive = status === "trialing" && hasAccess(tenant)
  const daysLeft = daysUntil(tenant.trialEndsAt)
  const allowance = await allowanceFor(tenant)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-5 h-5 text-[var(--teal)]" />
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Billing</h1>
          <p className="text-sm text-[var(--text-muted)]">Your plan, seats and payment details</p>
        </div>
      </div>

      {checkout === "success" && (
        <div className="mb-4 rounded-xl border border-[var(--teal)] bg-[rgba(43,168,162,0.1)] p-4 text-sm text-[var(--teal-light)]">
          Thanks — your subscription is being activated. This page updates as soon as Stripe confirms the payment.
        </div>
      )}

      <GlassCard className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Plan</p>
            <p className="text-lg font-semibold text-white">{subscribed ? allowance.plan.label : trialActive ? "Trial" : "None"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</p>
            <p className="text-lg font-semibold text-white">{STATUS_LABEL[status] ?? status}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Contacts</p>
            <p className="text-lg font-semibold text-white">
              {allowance.contacts.toLocaleString()}
              <span className="text-sm font-normal text-[var(--text-muted)]"> of {allowance.allowance.toLocaleString()}</span>
            </p>
          </div>
        </div>

        <p className="text-sm text-[var(--text-muted)]">
          {subscribed
            ? `${allowance.plan.label}, $${(tenant.seats * PRICE_PER_SEAT_USD).toLocaleString()}/month. The ${allowance.allowance.toLocaleString()} contact figure is a soft limit: Rapport never blocks a contact or an import because of it.`
            : trialActive
              ? `Free trial${daysLeft !== null ? ` — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}. Subscribe any time to keep access after it ends.`
              : "No active subscription. Start one to keep using Rapport."}
        </p>

        {allowance.notice && (
          <div className={`rounded-xl border p-3 text-sm ${allowance.over ? "border-[var(--gold)] text-[var(--gold)]" : "border-[var(--surface-border)] text-[var(--text-muted)]"}`}>
            {allowance.notice}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-[var(--surface-border)] pt-5">
          {tenant.stripeCustomerId ? (
            <ManageBillingButton />
          ) : null}
          {!subscribed && (
            <Link href="/billing" className="btn-primary inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-full font-semibold">
              <CreditCard className="w-4 h-4" /> {trialActive ? "Subscribe now" : "Start subscription"}
            </Link>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
