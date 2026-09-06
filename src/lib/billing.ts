import Stripe from "stripe"
import { db, tenants } from "@/lib/db"
import { eq } from "drizzle-orm"

let _stripe: Stripe | null = null
export function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
    _stripe = new Stripe(key)
  }
  return _stripe
}

export const PRICE_PER_SEAT_USD = 29
export const CONTACTS_PER_SEAT = 250
export const TRIAL_DAYS = 14
export const MAX_SEATS = 100

export type TenantBilling = {
  subscriptionStatus: string
  trialEndsAt: Date | null
  seats: number
}

/** True when the tenant may use the app: active subscription, or a trial that has not expired. */
export function hasAccess(t: TenantBilling, now = new Date()): boolean {
  if (t.subscriptionStatus === "active") return true
  if (t.subscriptionStatus === "trialing") {
    // A null trialEndsAt (pre-migration rows) is treated as an open trial.
    return !t.trialEndsAt || t.trialEndsAt.getTime() >= now.getTime()
  }
  return false
}

export function clampSeats(n: unknown): number {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v) || v < 1) return 1
  return Math.min(v, MAX_SEATS)
}

export async function createCheckoutSession({ tenantId, seats, successUrl, cancelUrl, customerEmail }: {
  tenantId: string
  seats: number
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}) {
  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set")

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
  if (!tenant) throw new Error("Tenant not found")

  const quantity = clampSeats(seats)

  return stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Reuse the Stripe customer if we already have one; otherwise let Checkout create it.
    ...(tenant.stripeCustomerId
      ? { customer: tenant.stripeCustomerId }
      : customerEmail ? { customer_email: customerEmail } : {}),
    client_reference_id: tenantId,
    metadata: { tenantId },
    subscription_data: { metadata: { tenantId } },
    allow_promotion_codes: true,
  })
}

export async function createPortalSession({ tenantId, returnUrl }: { tenantId: string; returnUrl: string }) {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
  if (!tenant?.stripeCustomerId) throw new Error("No Stripe customer for this tenant")
  return stripe().billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: returnUrl,
  })
}

function seatsFromSubscription(sub: Stripe.Subscription): number | undefined {
  const q = sub.items?.data?.[0]?.quantity
  return typeof q === "number" ? clampSeats(q) : undefined
}

/** Map a Stripe subscription status onto our column. A Stripe-side trial is a paid-plan trial, so it counts as active. */
function normalizeStatus(status: Stripe.Subscription.Status): string {
  return status === "trialing" ? "active" : status
}

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null
  return typeof x === "string" ? x : x.id
}

/** Apply a verified Stripe event to the tenants table. Unknown events are ignored. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenantId ?? session.client_reference_id
      if (!tenantId || session.mode !== "subscription") return

      const subscriptionId = idOf(session.subscription)
      const customerId = idOf(session.customer)

      let seats: number | undefined
      let status = "active"
      if (subscriptionId) {
        const sub = await stripe().subscriptions.retrieve(subscriptionId)
        seats = seatsFromSubscription(sub)
        status = normalizeStatus(sub.status)
      }

      await db.update(tenants).set({
        stripeCustomerId: customerId ?? undefined,
        stripeSubscriptionId: subscriptionId ?? undefined,
        plan: "pro",
        subscriptionStatus: status,
        ...(seats ? { seats } : {}),
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId))
      return
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenantId
      const customerId = idOf(sub.customer)

      // Prefer the tenantId we stamped on the subscription; fall back to the customer id.
      const where = tenantId
        ? eq(tenants.id, tenantId)
        : customerId ? eq(tenants.stripeCustomerId, customerId) : null
      if (!where) return

      const seats = seatsFromSubscription(sub)
      const status = event.type === "customer.subscription.deleted" ? "canceled" : normalizeStatus(sub.status)

      await db.update(tenants).set({
        stripeSubscriptionId: sub.id,
        subscriptionStatus: status,
        ...(seats ? { seats } : {}),
        updatedAt: new Date(),
      }).where(where)
      return
    }

    default:
      return
  }
}
