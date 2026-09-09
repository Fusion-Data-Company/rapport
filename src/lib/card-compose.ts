/**
 * The name is typeset, not generated.
 *
 * Rapport's whole promise is that the card says the contact's own name. The obvious
 * way to do that is to ask an image model to render it, and that is what this module
 * replaces, deliberately.
 *
 * On 2026-09-09 three image models were put through the same brief with the name "Rob":
 *
 *   gpt-image-2 (ElevenLabs)  spelled it correctly - but its REST endpoint requires a
 *                             Pro plan this account does not hold, so the server cannot
 *                             call it at send time.
 *   grok-imagine-image        produced "HAPPY BIRTHDAY ROB ROB". It set the name, then
 *                             set it again on the next line.
 *   Higgsfield                needs a server key pair this deployment does not have.
 *
 * The duplication is the important one. It is the same failure that once spelled a
 * client's four-letter logo "RRUCO": a model drawing letterforms is sampling, not
 * spelling, and it will eventually be wrong. A card is sent to one person, once, with
 * their name on it. There is no acceptable error rate for that.
 *
 * So the artwork is generated ONCE, per occasion, with the upper third deliberately
 * left empty, and the name is set into that space here - with a real typeface, through
 * opentype.js, as vector outlines. That gives four things a generated name cannot:
 *
 *   - the spelling is correct every single time, because it is not being guessed
 *   - it costs nothing per card, so a tenant sending 400 notes a month pays no API bill
 *   - it is instant, instead of forty seconds of polling while a send waits
 *   - it takes any name, any length, and any script the font covers
 *
 * This is also how a real stationery house works. The plate is printed in a run; the
 * name is foiled on afterwards.
 *
 * Text is converted to PATHS rather than being handed to an SVG <text> element on
 * purpose: SVG text depends on the renderer finding a font by name, which is a
 * different set of fonts on a laptop, in CI and on a Vercel lambda. A path is the same
 * shape everywhere.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import sharp from "sharp"
// Named imports, not a default. opentype.js's ESM build (dist/opentype.mjs) has no
// default export, so `import opentype from "opentype.js"` builds fine under tsx's CJS
// interop and then fails the Turbopack production build with "Export default doesn't
// exist in target module" - a break that only ever shows up on the deploy.
import { parse as parseFont, type Font } from "opentype.js"

const FONT_DIR = join(process.cwd(), "assets", "fonts")

/** Loaded once per lambda, not once per card. */
let scriptFont: Font | null = null
let smallFont: Font | null = null

function fonts() {
  if (!scriptFont) scriptFont = parseFont(toArrayBuffer(readFileSync(join(FONT_DIR, "PinyonScript-Regular.ttf"))))
  if (!smallFont) smallFont = parseFont(toArrayBuffer(readFileSync(join(FONT_DIR, "CormorantGaramond-SemiBold.ttf"))))
  return { script: scriptFont, small: smallFont }
}

function toArrayBuffer(b: Buffer): ArrayBuffer {
  // Node may hand back a view into a larger pool; opentype needs the exact bytes.
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

// Foil colours live in card-foil.ts, which imports nothing, so card-plates can name a
// foil without dragging sharp into a bundle that has no business holding it.
export { GOLD, ROSE_GOLD, DEEP_GOLD, IVORY, type Foil } from "./card-foil"
import type { Foil } from "./card-foil"
import { GOLD } from "./card-foil"

/**
 * One line of type, centred on `cx`, with its baseline at `y`, scaled DOWN (never up)
 * until it fits inside `maxWidth`. Never scaled up: a short name set enormous looks
 * like a mistake, and the plate's composition assumes a size.
 */
function centredPath(
  font: Font,
  text: string,
  cx: number,
  y: number,
  size: number,
  maxWidth: number,
  letterSpacing = 0,
): { d: string[]; width: number } {
  const measure = (s: number) => {
    let w = font.getAdvanceWidth(text, s)
    if (letterSpacing) w += letterSpacing * s * Math.max(0, text.length - 1)
    return w
  }
  let used = size
  const full = measure(size)
  if (full > maxWidth) used = size * (maxWidth / full)

  if (!letterSpacing) {
    const w = measure(used)
    return { d: [font.getPath(text, cx - w / 2, y, used).toPathData(2)], width: w }
  }

  // Tracked capitals are set glyph by glyph, because opentype applies no tracking.
  // Kept for completeness; the subline no longer uses this branch (see setTracked below).
  const total = measure(used)
  let x = cx - total / 2
  const parts: string[] = []
  for (const ch of text) {
    const d = font.getPath(ch, x, y, used).toPathData(2)
    if (d) parts.push(d)
    x += font.getAdvanceWidth(ch, used) + letterSpacing * used
  }
  return { d: parts, width: total }
}

/**
 * The small tracked line, set as ONE PATH PER WORD.
 *
 * Three arrangements were tried and two shipped bugs before this one:
 *
 *   one path for the whole line   librsvg truncates a long `d` attribute.
 *                                 "FUSION DATA COMPANY" drew as "FUSIO" and stopped
 *                                 mid-letter — 99px of ink against 424px of geometry,
 *                                 with the path data verified complete.
 *   one path per glyph            fixed the truncation and broke Cormorant's "N",
 *                                 which rendered as a bare vertical stem.
 *   thin spaces, one path         fixed the "N" and made the string long enough to hit
 *                                 the truncation again. "THE NEXT PART IS YOURS"
 *                                 reached production reading "THE NEXT P-".
 *
 * Per word satisfies both constraints at once: each word is a single getPath call, which
 * is the call that renders every glyph correctly, and no single path gets near the length
 * that gets cut. Tracking inside a word comes from thin spaces between the letters;
 * tracking between words comes from the advance.
 */
function setTracked(
  font: Font,
  text: string,
  cx: number,
  y: number,
  size: number,
  maxWidth: number,
): { d: string[]; width: number } {
  const THIN = "\u2009"
  const words = text.split(/\s+/).filter(Boolean).map((w) => w.split("").join(THIN))
  const gap = THIN + THIN + THIN // the space between words, in thin spaces

  const line = words.join(gap)
  let used = size
  const full = font.getAdvanceWidth(line, size)
  if (full > maxWidth) used = size * (maxWidth / full)

  const total = font.getAdvanceWidth(line, used)
  let x = cx - total / 2
  const parts: string[] = []
  for (let i = 0; i < words.length; i++) {
    const d = font.getPath(words[i], x, y, used).toPathData(2)
    if (d) parts.push(d)
    x += font.getAdvanceWidth(words[i], used)
    if (i < words.length - 1) x += font.getAdvanceWidth(gap, used)
  }
  return { d: parts, width: total }
}

export type ComposeOptions = {
  /** The plate: generated artwork with an empty upper third. */
  plate: Buffer
  /** The line that carries the name. "Happy Birthday, Rob" */
  line: string
  /** The small tracked line beneath it. Optional. */
  subline?: string | null
  foil?: Foil
  /** Longest edge of the delivered image. Defaults to DELIVERY_WIDTH. */
  maxWidth?: number
}

/**
 * The plates are generated at 1664x2080 so there is real resolution behind the type and
 * a print run stays possible. That is not what should land in an inbox: a 500 KB card on
 * a phone on cell data is a card nobody waits for. The type is composed at full plate
 * resolution — so the script stays crisp — and only the finished image is reduced.
 */
export const DELIVERY_WIDTH = 1200

/**
 * Set the name onto the plate and return a PNG.
 *
 * The type sits in the upper third because that is the band the plates are generated
 * empty. Sizes are expressed as fractions of the plate's own width, so a 1280px plate
 * and a 2048px plate produce the same design rather than the same pixel sizes.
 */
export async function composeCard(opts: ComposeOptions): Promise<Buffer> {
  const { script, small } = fonts()
  const foil = opts.foil ?? GOLD

  const meta = await sharp(opts.plate).metadata()
  const W = meta.width ?? 1280
  const H = meta.height ?? 720
  const cx = W / 2

  // The safe band: the empty upper third, inset so nothing kisses the trim.
  const maxWidth = W * 0.74

  const scriptSize = W * 0.105
  const scriptBaseline = H * 0.235
  const headline = centredPath(script, opts.line, cx, scriptBaseline, scriptSize, maxWidth)

  const paths: string[] = [...headline.d]

  if (opts.subline) {
    const subSize = W * 0.0225
    const subBaseline = scriptBaseline + H * 0.085
    paths.push(...setTracked(small, opts.subline.toUpperCase(), cx, subBaseline, subSize, W * 0.62).d)
  }

  // Every glyph is its own <path> element inside ONE document, and both halves of that
  // sentence were paid for.
  //
  // Joining the subline's glyphs into a single `d` attribute truncated it: librsvg drew
  // "FUSIO" and stopped, 99px of ink against 424px of geometry, while the identical
  // glyphs as separate elements measured the full 424px. Then rasterising each path as
  // its own sharp overlay - forty blur-and-composite passes - dropped the "N" and left a
  // bar. One document, many elements, two composites is the shape that renders whole.
  //
  // The shadow is a second blurred copy rather than an SVG <filter>, for the same class
  // of reason: a filter region is one more thing that differs between renderers, and the
  // point of setting type as outlines was to stop depending on renderer behaviour.
  //
  // The shadow offset is baked into the SVG rather than passed to composite(), because a
  // composite offset would push the layer past the bottom edge and sharp refuses an
  // overlay that does not fit.
  const layer = (fill: string, dy = 0) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
        `<g transform="translate(0 ${dy})">` +
        paths.map((d) => `<path d="${d}" fill="${fill}"/>`).join("") +
        `</g></svg>`,
    )

  const shadow = await sharp(layer(foil.shadow, W * 0.0018))
    .blur(Math.max(1, W * 0.004))
    .toBuffer()

  const cap = opts.maxWidth ?? DELIVERY_WIDTH

  // Two passes, deliberately. sharp applies resize BEFORE composite no matter which
  // order the calls are written in, so chaining .resize() onto this pipeline shrinks the
  // plate first and then rejects the full-size type overlay with "Image to composite must
  // have same dimensions or smaller". Compose at plate resolution, then reduce the
  // finished card — which is also the right order for quality: the script is rasterised
  // at 1664px and downsampled, rather than being drawn small.
  const full = await sharp(opts.plate)
    .composite([
      { input: shadow, top: 0, left: 0 },
      { input: layer(foil.fill), top: 0, left: 0 },
    ])
    .png()
    .toBuffer()

  return sharp(full)
    .resize({ width: Math.min(W, cap), withoutEnlargement: true })
    // JPEG, not PNG. The output is a photographic plate with type on it and it is going
    // into an email: 500 KB of PNG versus 150 KB of q90 JPEG, for no visible difference,
    // is a spam-filter argument nobody needs to have. mozjpeg keeps the foil clean at the
    // edges, which is where a cheap encoder shows its teeth on fine script.
    // q82 with mozjpeg, not q90. On the plates with high-frequency detail — brick, stone,
    // knitted wool — q90 produced 730 KB cards, which is a slow image on cell data for no
    // visible gain. 4:4:4 chroma is kept regardless of quality: the foil script is a thin
    // saturated line on a coloured ground, and that is exactly what chroma subsampling
    // smears.
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer()
}

/** Escape nothing: text became paths, so no user string ever reaches the SVG as markup.
 *  This is noted because it is the reason there is no sanitiser here. */
export const NAMES_ARE_PATHS_NOT_MARKUP = true
