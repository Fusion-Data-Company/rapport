/**
 * Contact tiers, and what a plan covers.
 *
 * Not every name in a book deserves the same attention. A is the inner circle and
 * hears about everything; B is the working book; C is the long tail who should hear
 * from you a few times a year and not once a month. The tier sets a minimum gap
 * between notes, which is the honest way to say "less often" without dropping the
 * dates that matter.
 *
 * On plans: the contact allowance is a soft limit. Going over never blocks an import
 * or refuses a contact - it shows the agent where they are and what the next step
 * costs. A cap that locks a paying customer out of their own book is how a tool gets
 * cancelled in month three.
 */
import { db, contacts, scheduledSends } from "@/lib/db"
import { and, eq, inArray, sql } from "drizzle-orm"
import { normalizeTier, type Tier } from "@/lib/tier-labels"

export { TIERS, TIER_LABEL, TIER_HINT, isTier, normalizeTier } from "@/lib/tier-labels"
export type { Tier } from "@/lib/tier-labels"

export type TierSettings = {
  tierAMinDays?: number | null
  tierBMinDays?: number | null
  tierCMinDays?: number | null
}

export const DEFAULT_TIER_DAYS: Record<Tier, number> = { A: 0, B: 21, C: 75 }

export function minDaysFor(tier: Tier, settings: TierSettings): number {
  const raw = tier === "A" ? settings.tierAMinDays : tier === "B" ? settings.tierBMinDays : settings.tierCMinDays
  if (raw == null || !Number.isInteger(raw) || raw < 0 || raw > 365) return DEFAULT_TIER_DAYS[tier]
  return raw
}

/**
 * True when this contact has been written to too recently for their tier.
 * `lastSent` is an ISO date string, or null when nothing has ever gone out.
 */
export function withinTierGap(opts: {
  tier: string | null | undefined
  lastSent: string | null | undefined
  on: string
  settings: TierSettings
}): boolean {
  const gap = minDaysFor(normalizeTier(opts.tier), opts.settings)
  if (gap <= 0 || !opts.lastSent) return false
  const days = Math.floor(
    (Date.parse(`${opts.on}T00:00:00Z`) - Date.parse(`${opts.lastSent}T00:00:00Z`)) / 86_400_000,
  )
  return days >= 0 && days < gap
}

/** The most recent send date per contact, for a set of contacts. */
export async function lastSentByContact(tenantId: string, contactIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (contactIds.length === 0) return out
  const rows = await db
    .select({ contactId: scheduledSends.contactId, last: sql<string>`max(${scheduledSends.scheduledDate})` })
    .from(scheduledSends)
    .where(and(
      eq(scheduledSends.tenantId, tenantId),
      eq(scheduledSends.status, "sent"),
      inArray(scheduledSends.contactId, contactIds),
    ))
    .groupBy(scheduledSends.contactId)
  for (const r of rows) if (r.last) out.set(r.contactId, String(r.last).slice(0, 10))
  return out
}

// ── Plans ────────────────────────────────────────────────────────────────────

export type Plan = {
  id: string
  label: string
  /** Contacts the plan is priced for. Soft: going over nudges, never blocks. */
  contacts: number
  priceUsd: number
  /** Stripe seat quantity that buys this plan. Billing itself is unchanged. */
  seats: number
  blurb: string
}

/**
 * Three rungs by contact count, priced off the one Stripe seat price. A seat is the
 * billing unit; the contact count is what the agent actually shops on, which is why
 * the plan is named for the book size and not for the seat.
 */
export const PLANS: Plan[] = [
  { id: "trial", label: "Trial", contacts: 500, priceUsd: 0, seats: 0, blurb: "Fourteen days, no card, room for a real book." },
  { id: "solo", label: "Solo", contacts: 1000, priceUsd: 39, seats: 1, blurb: "One agent, one mailbox, up to a thousand people worth remembering." },
  { id: "book", label: "Book", contacts: 5000, priceUsd: 78, seats: 2, blurb: "A full book of business, and texting when it ships." },
]

export const PAID_PLANS = PLANS.filter((p) => p.priceUsd > 0)

/**
 * Where a book that has outgrown Solo is still comfortable. Between the allowance and
 * this the nudge is a note; past it, it is the first thing on the page. Neither blocks.
 */
export const SOFT_CEILING = 1500

/** The plan a tenant is on, from their billing state. */
export function planForTenant(t: { subscriptionStatus: string; seats: number }): Plan {
  if (t.subscriptionStatus !== "active") return PLANS[0]
  return t.seats >= 2 ? PLANS[2] : PLANS[1]
}

export async function activeContactCount(tenantId: string): Promise<number> {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(contacts)
    .where(and(eq(contacts.tenantId, tenantId), eq(contacts.status, "active")))
  return Number(rows[0]?.n ?? 0)
}

export type Allowance = {
  plan: Plan
  contacts: number
  allowance: number
  /** 0 to 1 and beyond; over 1 means past the allowance. */
  usage: number
  over: boolean
  /** True once the book is past the comfortable ceiling as well as the allowance. */
  wellOver: boolean
  /** Plain sentence for the UI, or null when there is nothing to say. */
  notice: string | null
  nextPlan: Plan | null
}

/**
 * Where this tenant stands against their plan. Never an error, never a block: the
 * worst it does is tell the truth and point at the next step. A cap that locks a
 * paying customer out of their own book is how a tool gets cancelled in month three.
 */
export async function allowanceFor(tenant: { id: string; subscriptionStatus: string; seats: number }): Promise<Allowance> {
  const plan = planForTenant(tenant)
  const count = await activeContactCount(tenant.id)
  const allowance = plan.contacts
  const usage = allowance > 0 ? count / allowance : 0
  const nextPlan = PAID_PLANS.find((p) => p.contacts > allowance) ?? null
  const over = count > allowance

  let notice: string | null = null
  if (over) {
    notice = nextPlan
      ? `${count.toLocaleString()} contacts on ${plan.label}, which is priced for ${allowance.toLocaleString()}. Nothing is blocked and nothing will be. ${nextPlan.label} covers ${nextPlan.contacts.toLocaleString()} for $${nextPlan.priceUsd} a month.`
      : `${count.toLocaleString()} contacts, past the ${allowance.toLocaleString()} ${plan.label} is priced for. Nothing is blocked. Tell us if the book keeps growing and we will sort out the plan.`
  } else if (usage >= 0.8 && nextPlan) {
    notice = `${count.toLocaleString()} of ${allowance.toLocaleString()} contacts on ${plan.label}. ${nextPlan.label} covers ${nextPlan.contacts.toLocaleString()} for $${nextPlan.priceUsd} a month when you need it.`
  }

  return {
    plan, contacts: count, allowance, usage, over,
    wellOver: count > Math.max(allowance, SOFT_CEILING),
    notice, nextPlan,
  }
}
