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

/** OccasionType (src/lib/occasions.ts) to plate. Anything unmapped gets the neutral one,
 *  which is deliberately occasion-free rather than a wrong occasion. */
const BY_OCCASION: Record<string, Plate> = {
  birthday: BIRTHDAY,
  child_birthday: BIRTHDAY,
  anniversary: ANNIVERSARY,
  policy_renewal: RENEWAL,
  home_anniversary: HOME,
  loan_anniversary: HOME,
  months_since_close: NEUTRAL,
  review_request: THANKS,
  sports_win: NEUTRAL,
  sports_loss: NEUTRAL,
}

export function plateFor(occasion: string): Plate {
  return BY_OCCASION[occasion] ?? NEUTRAL
}

/** Every plate that ships, for the gallery and for a build-time existence check. */
export const ALL_PLATES: Plate[] = [BIRTHDAY, ANNIVERSARY, RENEWAL, HOME, THANKS, NEUTRAL]

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
