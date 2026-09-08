/** Tier vocabulary with no database import, so client components can share it. */
export const TIERS = ["A", "B", "C"] as const
export type Tier = (typeof TIERS)[number]

export const TIER_LABEL: Record<Tier, string> = {
  A: "A - inner circle",
  B: "B - working book",
  C: "C - long tail",
}

export const TIER_HINT: Record<Tier, string> = {
  A: "Every occasion, no gap. The twenty people whose renewal you cannot lose.",
  B: "The default. Every occasion, with a few weeks between notes.",
  C: "The long tail. A couple of notes a year, and only the dates that matter.",
}

export function isTier(v: unknown): v is Tier {
  return typeof v === "string" && (TIERS as readonly string[]).includes(v)
}

export function normalizeTier(v: unknown): Tier {
  const up = String(v ?? "").trim().toUpperCase()
  return isTier(up) ? up : "B"
}
