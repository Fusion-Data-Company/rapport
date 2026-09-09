/**
 * Which plate an occasion gets, and what foil survives on it.
 *
 * A plate is generated artwork with its upper third deliberately empty; the name is set
 * into that band by card-compose. Foil is chosen per plate rather than globally because
 * gold that reads beautifully on midnight navy vanishes on cream - the thank-you plate
 * needs a deeper, darker gold and a light shadow behind it, which is exactly how foil
 * behaves on real paper.
 */
import { createHmac } from "node:crypto"
import { GOLD, DEEP_GOLD, type Foil } from "./card-foil"

export type Plate = {
  /** File under public/img/plates. JPEG: these are photographic plates, and a 1.6 MB
   *  PNG of a painted still life is a deliverability problem in an email, not a quality
   *  win - the same plate is 175 KB at q90 with no visible difference. */
  file: string
  foil: Foil
  /** The small tracked line under the name. Null when the plate should stand alone. */
  subline: string | null
}

const BIRTHDAY: Plate = { file: "birthday.jpg", foil: GOLD, subline: "Many Happy Returns" }
const ANNIVERSARY: Plate = { file: "anniversary.jpg", foil: GOLD, subline: "To Many More Years" }
const RENEWAL: Plate = { file: "renewal.jpg", foil: GOLD, subline: null }
const HOME: Plate = { file: "home.jpg", foil: GOLD, subline: null }
const THANKS: Plate = { file: "thanks.jpg", foil: DEEP_GOLD, subline: null }
const NEUTRAL: Plate = { file: "neutral.jpg", foil: DEEP_GOLD, subline: null }

// Hand-chosen occasions. A renewal calendar cannot know a client had a baby, buried a
// parent or finally retired, and those are the notes an agent gets remembered for.
const BABY_BOY: Plate = { file: "baby-boy.jpg", foil: DEEP_GOLD, subline: "It's a Boy" }
const BABY_GIRL: Plate = { file: "baby-girl.jpg", foil: DEEP_GOLD, subline: "It's a Girl" }
const WEDDING: Plate = { file: "wedding.jpg", foil: DEEP_GOLD, subline: "On Your Wedding Day" }
const GRADUATION: Plate = { file: "graduation.jpg", foil: GOLD, subline: "On Your Graduation" }
const RETIREMENT: Plate = { file: "retirement.jpg", foil: GOLD, subline: "The Next Part Is Yours" }
const GETWELL: Plate = { file: "getwell.jpg", foil: DEEP_GOLD, subline: "Thinking of You" }
// Sympathy carries no subline. Anything added under those three words reads as filler,
// and the one card in the set where nothing should be added is this one.
const SYMPATHY: Plate = { file: "sympathy.jpg", foil: DEEP_GOLD, subline: null }
const CONGRATS: Plate = { file: "congrats.jpg", foil: GOLD, subline: "Well Earned" }
const HOLIDAY: Plate = { file: "holiday.jpg", foil: GOLD, subline: "With Warmest Wishes" }

/**
 * WHICH PLATES ARE IN SERVICE, AND WHY THE LIGHT ONES ARE NOT.
 *
 * The foil is measured against the actual pixels of the band the name sits in
 * (y 0.13-0.33, x 0.13-0.87 of the plate), as a WCAG contrast ratio. On 2026-09-09:
 *
 *     anniversary  11.64   renewal   11.11   graduation 11.15
 *     holiday      10.77   congrats  10.63   birthday   10.25
 *     ---- everything above ships, everything below does not ----
 *     wedding       2.90   baby-girl  2.40   baby-boy    2.13
 *     thanks        2.06   home       2.04   getwell     1.62
 *     sympathy      1.39   retirement 1.16
 *
 * Every dark plate clears 10:1. Every light plate fails, and retirement at 1.16 is
 * gold script on sunlit limewash - the name is simply not there. DEEP_GOLD was meant
 * to solve this and does not: #A57B32 is still a light-mid tone, and on cream it is
 * two shades of the same thing.
 *
 * The fix is a genuinely dark foil for pale stock - near-black warm brown or deep
 * ink, the way a letterpress card actually prints on cream - and that is a design
 * pass, not a mapping. Until then these occasions are NOT offered rather than being
 * offered with an invisible name, and any occasion that still resolves to a retired
 * plate falls back to RENEWAL: dark, restrained and occasion-free, so it is never
 * wrong for the moment even when it is not specific to it.
 */
const BY_OCCASION: Record<string, Plate> = {
  birthday: BIRTHDAY,
  child_birthday: BIRTHDAY,
  anniversary: ANNIVERSARY,
  policy_renewal: RENEWAL,
  home_anniversary: RENEWAL,
  loan_anniversary: RENEWAL,
  months_since_close: RENEWAL,
  review_request: RENEWAL,
  sports_win: RENEWAL,
  sports_loss: RENEWAL,
  new_baby_boy: RENEWAL,
  new_baby_girl: RENEWAL,
  new_baby: RENEWAL,
  wedding: RENEWAL,
  graduation: GRADUATION,
  retirement: RENEWAL,
  new_home: RENEWAL,
  get_well: RENEWAL,
  sympathy: RENEWAL,
  congratulations: CONGRATS,
  holiday: HOLIDAY,
  thank_you: RENEWAL,
}

/**
 * The occasions actually offered. Six, not fifteen — one per plate whose foil is
 * legible. The other nine plates are cut and committed and come back the moment
 * there is a foil that survives on pale stock; see the contrast table above.
 */
export const CARD_OCCASIONS: { id: string; label: string }[] = [
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "policy_renewal", label: "Renewal" },
  { id: "congratulations", label: "Congratulations" },
  { id: "graduation", label: "Graduation" },
  { id: "holiday", label: "Holidays" },
]

/** Cut, committed, and held back until the foil reads on them. */
export const PLATES_AWAITING_A_DARK_FOIL = [
  "wedding.jpg", "baby-boy.jpg", "baby-girl.jpg", "thanks.jpg",
  "home.jpg", "getwell.jpg", "sympathy.jpg", "retirement.jpg",
]

export function plateFor(occasion: string): Plate {
  return BY_OCCASION[occasion] ?? NEUTRAL
}

/** Every plate that ships, for the gallery and for a build-time existence check. */
export const ALL_PLATES: Plate[] = [
  BIRTHDAY, ANNIVERSARY, RENEWAL, HOME, THANKS, NEUTRAL,
  BABY_BOY, BABY_GIRL, WEDDING, GRADUATION, RETIREMENT, GETWELL, SYMPATHY, CONGRATS, HOLIDAY,
]

/**
 * The card renderer's parameters are signed, because an unsigned one is a tool for
 * putting arbitrary text in gold foil over Rapport's own artwork on Rapport's own domain.
 * One signature covers occasion, name and subline together so none can be swapped
 * independently. It gates MINTING a card, not viewing one - a card URL in an email is as
 * fetchable as any other image, which is the point.
 *
 * This lives beside the plates rather than in the route so the send path can sign a URL
 * without importing a route module.
 */
export function cardSigningSecret(): string {
  return (
    process.env.CARD_SIGNING_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.CREDENTIALS_KEY ||
    ""
  )
}

export function signCard(occasion: string, name: string, subline: string | null): string {
  return createHmac("sha256", cardSigningSecret())
    .update(`${occasion} ${name} ${subline ?? ""}`)
    .digest("base64url")
    .slice(0, 24)
}

/** The absolute URL of one composed card, or null when signing is not configured. */
export function cardUrl(occasion: string, name: string, subline?: string | null): string | null {
  if (!cardSigningSecret()) return null
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  ).replace(/\/$/, "")
  if (!base) return null
  const sub = subline ?? null
  const q = new URLSearchParams({ o: occasion, n: name, k: signCard(occasion, name, sub) })
  if (sub) q.set("s", sub)
  return `${base}/api/cards/render?${q.toString()}`
}
