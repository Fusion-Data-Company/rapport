/**
 * The card, made for the person whose name is on it.
 *
 * The whole point of Rapport is that a contact gets a card for the occasion with their
 * own name printed on the cardstock - "Happy Birthday, Rob" - not a stock photograph
 * with the name typed into the email underneath. This module owns the prompt that
 * produces that card and the seam a generation provider plugs into.
 *
 * Three things are deliberately separated:
 *
 *   cardPrompt()  is pure. It turns an occasion, a first name and the sender's own line
 *                 into the brief. It is the SAME brief that produced the eight cards in
 *                 public/img/cards, so what the runtime makes and what ships in the box
 *                 cannot drift apart. It never touches the network.
 *
 *   provider()    returns whatever image generator is configured, or null.
 *
 *   resolveCard() is what the send path calls. Nothing in it depends on a provider
 *                 existing: with no credential it falls back to the occasion's system
 *                 card, which already carries a name and already looks like a card.
 *
 * The provider is Higgsfield's documented server API (docs.higgsfield.ai, base
 * https://api.higgsfield.ai, `Authorization: Key <id>:<secret>`). It needs a server-side
 * key pair from cloud.higgsfield.ai, which this deployment does not hold yet - see the
 * night report. No other vendor is contacted. OpenRouter is not used for images.
 */

// ── The brief ────────────────────────────────────────────────────────────────

export type CardBrief = {
  /** OccasionType from src/lib/occasions.ts. Unknown values get the neutral card. */
  occasion: string
  /** The name that gets printed. The contact's first name, or a child's name. */
  name: string
  /** The sender's own line, folded into the brief. Optional, and never required. */
  senderLine?: string | null
}

/** A name that can be set in foil without embarrassing anybody. */
function cleanName(name: string): string {
  const n = (name ?? "").trim().replace(/\s+/g, " ")
  if (!n) return "Friend"
  // One given name is what fits on one line of script.
  const first = n.split(" ")[0].replace(/[^\p{L}\p{M}'-]/gu, "")
  if (!first) return "Friend"
  return first.slice(0, 18)
}

/** One line, printed on the card, with the name set into it. */
export function occasionLine(occasion: string, name: string): string {
  const who = cleanName(name)
  switch (occasion) {
    case "birthday":
    case "child_birthday":      return `Happy Birthday, ${who}`
    case "anniversary":         return `Happy Anniversary, ${who}`
    case "policy_renewal":      return `Here's to Another Year, ${who}`
    case "home_anniversary":    return `Happy Home Anniversary, ${who}`
    case "loan_anniversary":    return `Happy Closing Anniversary, ${who}`
    case "months_since_close":  return `Good to Know You, ${who}`
    case "review_request":      return `Thank You, ${who}`
    case "sports_win":          return `What a Game, ${who}`
    case "sports_loss":         return `Next One's Ours, ${who}`
    default:                    return `Thinking of You, ${who}`
  }
}

type Register = {
  /** The paper. Not every occasion is ivory - a closing anniversary is navy and gold. */
  stock: string
  /** The frame inside the trim: debossed on light stock, foil-stamped on dark. */
  rule: string
  /** The picture. Full and generously scaled; a small vignette on a big empty field
   *  is what got the first set rejected. */
  artwork: string
  /** The face the occasion line is set in. */
  lettering: string
}

const FOIL_SCRIPT = "gold-foil engraved copperplate script"
const BRUSH_SCRIPT = "warm gold-foil hand-lettered brush script"
const DEBOSSED_RULE = "blind-letterpress rule debossed"
const FOIL_RULE = "gold-foil rule stamped"
const IVORY = "ivory cotton rag"

/**
 * The register, per occasion. Every one of these was rendered and looked at before it
 * was written down; the eight files in public/img/cards are these exact briefs with
 * "Rob" in the line.
 */
function register(occasion: string): Register {
  switch (occasion) {
    case "birthday":
      return { stock: IVORY, rule: DEBOSSED_RULE, lettering: FOIL_SCRIPT,
        artwork: "a lavish hand-painted wreath of garden roses, ranunculus, eucalyptus and gilded wheat encircling a small cream-frosted layer cake with one lit beeswax candle, luminous watercolour with fine ink linework and gold-leaf accents, dusty rose, sage, blush and warm gold palette" }
    case "child_birthday":
      return { stock: "soft-white cotton", rule: DEBOSSED_RULE, lettering: BRUSH_SCRIPT,
        artwork: "a joyful bouquet of nine balloons on curling ribbons lifting a small pastel layer cake, confetti and tiny stars drifting around them, bright cheerful gouache with fine ink linework, coral, buttercup, sky blue, mint and bubblegum pink palette" }
    case "anniversary":
      return { stock: IVORY, rule: DEBOSSED_RULE, lettering: FOIL_SCRIPT,
        artwork: "two slender crystal champagne coupes touching amid a full spray of blush garden roses, cream peonies and eucalyptus with gold-leaf highlights, luminous watercolour with fine ink linework, dusty rose, sage, cream and warm gold palette" }
    case "policy_renewal":
      return { stock: "warm ivory cotton rag", rule: DEBOSSED_RULE, lettering: FOIL_SCRIPT,
        artwork: "a broad old oak in full leaf sheltering a small gabled house, a meadow of wildflowers at its foot, painted in luminous gouache with gold-leaf highlights along the leaf edges, sage green, warm ochre, soft slate and gold palette" }
    case "home_anniversary":
      return { stock: "warm cream cotton", rule: DEBOSSED_RULE, lettering: FOIL_SCRIPT,
        artwork: "a polished brass house key on a silk ribbon resting across a sprig of olive beside a small stone cottage with a warm lit window and a climbing rose over the door, luminous gouache with gold-leaf accents, warm brass, sage, dusty blue and cream palette" }
    case "loan_anniversary":
      return { stock: "deep navy cotton", rule: FOIL_RULE, lettering: FOIL_SCRIPT,
        artwork: "a handsome panelled front door in deep teal with a polished brass knocker and a full seasonal wreath of olive, magnolia leaves and red berries, warm light spilling from the sidelight window, luminous gouache with gold-leaf accents, navy, brass, sage and warm cream palette" }
    case "months_since_close":
      return { stock: "warm ivory cotton rag", rule: DEBOSSED_RULE, lettering: FOIL_SCRIPT,
        artwork: "two steaming coffee cups on saucers side by side on a linen cloth with a sprig of eucalyptus and a full posy of autumn blooms, luminous watercolour with fine ink linework and gold-leaf accents, warm terracotta, cream, sage and soft gold palette" }
    case "review_request":
      return { stock: IVORY, rule: DEBOSSED_RULE, lettering: FOIL_SCRIPT,
        artwork: "a full laurel wreath of olive and eucalyptus leaves in gold leaf and sage watercolour enclosing a lush cluster of cream peonies and blush garden roses, fine ink linework, sage green, soft gold and blush palette" }
    case "sports_win":
    case "sports_loss":
      return { stock: IVORY, rule: DEBOSSED_RULE, lettering: FOIL_SCRIPT,
        artwork: "a pair of stadium pennants crossed over a full laurel spray with gold-leaf accents, luminous watercolour with fine ink linework, warm ochre, slate, cream and gold palette" }
    default:
      return { stock: IVORY, rule: DEBOSSED_RULE, lettering: FOIL_SCRIPT,
        artwork: "a generous posy of seasonal garden flowers tied with a silk ribbon, luminous watercolour with fine ink linework and gold-leaf accents, sage, blush and warm gold palette" }
  }
}

/**
 * The brief that produced the shipped set.
 *
 * Three rules are load-bearing and were each paid for with a rejected batch:
 *
 *   1. ONE line of type. A single line is what a text-rendering model gets right every
 *      time; two competing lines is where the spelling falls apart. The sender's own
 *      words steer the picture and appear in the note - they are not stamped in foil.
 *   2. The framing is stated three ways - square to the camera, fully inside the frame,
 *      even margin on all four sides. Left looser, the model tilts the card and crops
 *      the name off the edge.
 *   3. The artwork FILLS the panel. A small vignette floating on a big empty field is
 *      what the first eight looked like, and it is why they were rejected.
 */
export function cardPrompt(brief: CardBrief): string {
  const r = register(brief.occasion)
  const line = occasionLine(brief.occasion, brief.name)
  return [
    "Front cover of a luxury greeting card, flat lay, photographed perfectly square to the",
    "camera from directly above, resting on a smooth pale ivory paper surface. The card",
    "occupies about eighty percent of the frame height, is entirely within the frame and",
    "centred, with a clear even margin of that surface visible on all four sides - no tilt,",
    "no perspective, no rotation, nothing touching or crossing the edge of the frame.",
    `Heavy 600gsm ${r.stock} cardstock with a softly deckled edge and a fine ${r.rule}`,
    "a quarter inch inside the trim. Filling the upper half of the panel, leaving the lower",
    `third clear, generously scaled and comfortably inside that rule: ${r.artwork}${senderDirection(brief.senderLine)}.`,
    `In that clear lower third, one single line of ${r.lettering}, set on one line only,`,
    "horizontally centred, with a clear even space between every word, never wrapping and",
    `never touching the artwork, reading exactly: ${line}. That single line is the only text`,
    "anywhere in the image - no other words, letters, numbers, logo, signature or watermark.",
    "Real metallic foil stamping with a soft specular catch and the paper fibre visible",
    "around the letters. Soft even studio light, premium stationery photography, Hallmark",
    "Signature quality, crisp perfectly legible lettering, correct spelling, generous even",
    "word spacing.",
  ].join(" ")
}

/**
 * The sender's own line steers the picture; it is not printed.
 *
 * Rob's requirement is that the note the sender adds goes INTO the generation. It does -
 * it changes what is painted. What it must not do is become a second line of foil type:
 * a second line is where a text-rendering model starts misspelling, and the sender's
 * sentence already appears in the note itself, which is where a personal line belongs.
 */
function senderDirection(senderLine?: string | null): string {
  const s = (senderLine ?? "").trim().replace(/\s+/g, " ").slice(0, 160)
  if (!s) return ""
  const safe = s.replace(/["\\]/g, "")
  return `. Let the artwork quietly reflect this, without writing any of it on the card: ${safe}`
}

// ── The provider seam ────────────────────────────────────────────────────────

export type GeneratedCard = {
  imageUrl: string
  thumbnailUrl: string | null
  provider: string
  prompt: string
}

export interface CardImageProvider {
  readonly id: string
  generate(brief: CardBrief, opts?: { timeoutMs?: number }): Promise<GeneratedCard>
}

/** docs.higgsfield.ai. Overridable so a slug change needs no deploy of new code. */
const HIGGSFIELD_BASE = (process.env.HIGGSFIELD_API_BASE ?? "https://api.higgsfield.ai").replace(/\/+$/, "")
const HIGGSFIELD_PATH = (process.env.HIGGSFIELD_CARD_MODEL ?? "higgsfield-ai/soul/v2/standard").replace(/^\/+/, "")
/** 4:5 is a greeting card. The shipped set was rendered at this ratio. */
const CARD_RATIO = process.env.HIGGSFIELD_CARD_RATIO ?? "4:5"

/** "id:secret", or the two halves separately. Nothing is logged either way. */
function higgsfieldCredentials(): string | null {
  const joined = process.env.HIGGSFIELD_CREDENTIALS?.trim()
  if (joined && joined.includes(":")) return joined
  const id = process.env.HF_API_KEY_ID?.trim() ?? process.env.HIGGSFIELD_API_KEY_ID?.trim()
  const secret = process.env.HF_API_KEY_SECRET?.trim() ?? process.env.HIGGSFIELD_API_KEY_SECRET?.trim()
  return id && secret ? `${id}:${secret}` : null
}

type StatusBody = {
  status?: string
  results?: { raw?: { url?: string }; min?: { url?: string } }
  images?: { url?: string }[]
  error?: string
}

function urlFrom(body: StatusBody): { imageUrl: string; thumbnailUrl: string | null } | null {
  const raw = body.results?.raw?.url ?? body.images?.[0]?.url
  if (!raw) return null
  return { imageUrl: raw, thumbnailUrl: body.results?.min?.url ?? null }
}

/**
 * Higgsfield's server API: POST the prompt, get a request id and a status URL back,
 * poll until terminal. There are no webhooks, so polling is the documented shape.
 *
 * The two model families take different envelopes - the queue paths read `input`, the
 * /v1/ paths read `params` - so the envelope follows the configured path rather than
 * being guessed at call time.
 */
export class HiggsfieldProvider implements CardImageProvider {
  readonly id = "higgsfield"
  constructor(private readonly credentials: string) {}

  async generate(brief: CardBrief, opts: { timeoutMs?: number } = {}): Promise<GeneratedCard> {
    const deadline = Date.now() + (opts.timeoutMs ?? 90_000)
    const prompt = cardPrompt(brief)
    const headers = {
      Authorization: `Key ${this.credentials}`,
      "Content-Type": "application/json",
    }
    const payload = { prompt, aspect_ratio: CARD_RATIO }
    const body = HIGGSFIELD_PATH.startsWith("v1/") ? { params: payload } : { input: payload }

    const started = await fetch(`${HIGGSFIELD_BASE}/${HIGGSFIELD_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
    })
    if (!started.ok) {
      throw new Error(`Card provider refused the request (${started.status})`)
    }
    const submitted = (await started.json()) as StatusBody & { status_url?: string; request_id?: string; id?: string }

    // Some models answer in the same response.
    const immediate = urlFrom(submitted)
    if (immediate) return { ...immediate, provider: this.id, prompt }

    const jobId = submitted.request_id ?? submitted.id
    const statusUrl = submitted.status_url ?? (jobId ? `${HIGGSFIELD_BASE}/requests/${jobId}/status` : null)
    if (!statusUrl) throw new Error("Card provider returned no status URL")

    while (Date.now() < deadline) {
      await sleep(3_000)
      const res = await fetch(statusUrl, {
        headers,
        signal: AbortSignal.timeout(Math.max(1_000, Math.min(15_000, deadline - Date.now()))),
      })
      if (!res.ok) continue
      const status = (await res.json()) as StatusBody
      const state = (status.status ?? "").toLowerCase()
      if (state === "completed" || state === "succeeded") {
        const found = urlFrom(status)
        if (!found) throw new Error("Card provider finished without an image")
        return { ...found, provider: this.id, prompt }
      }
      if (state === "failed" || state === "nsfw" || state === "canceled") {
        throw new Error(`Card provider stopped: ${state}`)
      }
    }
    throw new Error("Card provider ran past the time a note can wait")
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/** The configured provider, or null when no credential is set. Never throws. */
export function provider(): CardImageProvider | null {
  const credentials = higgsfieldCredentials()
  return credentials ? new HiggsfieldProvider(credentials) : null
}

/** Whether runtime generation is switched on for this deployment. */
export function cardGenerationConfigured(): boolean {
  return provider() !== null
}

// ── What the send path calls ─────────────────────────────────────────────────

export type CardSource = "generated" | "tenant" | "system" | "none"

export type ResolvedCard = {
  imageUrl: string | null
  thumbnailUrl: string | null
  /** The card_templates row this came from, when it came from one. */
  templateId: string | null
  source: CardSource
  /** The line printed on the card, so the UI can say what it says. */
  line: string
  /** Set when generation was attempted and did not work. Never blocks the send. */
  error?: string
}

export type FallbackCard = {
  id: string
  imageUrl: string
  thumbnailUrl: string | null
  tenantId: string | null
} | null | undefined

/**
 * One named card for one note.
 *
 * Generates when a provider is configured, and falls back to the occasion's own system
 * card otherwise, so a note is never sent bare and a missing credential can never take
 * the product down.
 */
export async function resolveCard(opts: {
  occasion: string
  name: string
  senderLine?: string | null
  fallback: FallbackCard
  timeoutMs?: number
}): Promise<ResolvedCard> {
  const line = occasionLine(opts.occasion, opts.name)
  const fall = (error?: string): ResolvedCard => ({
    imageUrl: opts.fallback?.imageUrl ?? null,
    thumbnailUrl: opts.fallback?.thumbnailUrl ?? null,
    templateId: opts.fallback?.id ?? null,
    source: opts.fallback ? (opts.fallback.tenantId ? "tenant" : "system") : "none",
    line,
    ...(error ? { error } : {}),
  })

  const p = provider()
  if (!p) return fall()

  try {
    const made = await p.generate(
      { occasion: opts.occasion, name: opts.name, senderLine: opts.senderLine },
      { timeoutMs: opts.timeoutMs },
    )
    return {
      imageUrl: made.imageUrl,
      thumbnailUrl: made.thumbnailUrl,
      templateId: opts.fallback?.id ?? null,
      source: "generated",
      line,
    }
  } catch (e) {
    // A card that could not be made is a card that falls back, not a note that fails.
    return fall(e instanceof Error ? e.message : String(e))
  }
}
