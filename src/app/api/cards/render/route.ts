/**
 * The card itself, as an image, rendered on request.
 *
 * A note's card is an <img> in an email, so the card has to live at a URL an email
 * client will fetch months later with no session. That rules out returning bytes from
 * the send path and rules out a signed-URL scheme that expires. What it needs is a
 * stable, cacheable, cheap-to-serve URL - which is exactly what this is, because
 * composing a card is a plate read plus two composites, not an API call.
 *
 * The parameters are SIGNED. Without a signature this is an open endpoint that renders
 * arbitrary text in gold foil over Rapport's own artwork, which is a defacement tool
 * with our domain on it. The signature covers occasion, name and subline together, so
 * none of the three can be swapped independently.
 *
 * It is not a secret, though - anyone holding a card's URL can fetch the card, exactly
 * as with any image in any email. The signature stops minting new ones, not viewing.
 */
import { timingSafeEqual } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { NextRequest } from "next/server"
import { composeCard } from "@/lib/card-compose"
import { plateFor, signCard, cardSigningSecret } from "@/lib/card-plates"
import { occasionLine } from "@/lib/card-image"

export const runtime = "nodejs"
// Sharp and the fonts are real work on a cold start; keep the instance warm rather than
// paying it per card in a morning's send.
export const dynamic = "force-dynamic"

function signatureOk(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const occasion = p.get("o") ?? ""
  const name = (p.get("n") ?? "").slice(0, 60)
  const subline = p.get("s")
  const sig = p.get("k") ?? ""

  if (!cardSigningSecret()) {
    // Failing closed is right here: an unsigned renderer is worse than a missing card,
    // and resolveCard falls back to a system card without ever calling this.
    return new Response("card signing is not configured", { status: 503 })
  }
  if (!signatureOk(sig, signCard(occasion, name, subline))) {
    return new Response("bad signature", { status: 403 })
  }

  const plate = plateFor(occasion)
  let img: Buffer
  try {
    const art = await readFile(join(process.cwd(), "public", "img", "plates", plate.file))
    img = await composeCard({
      plate: art,
      line: occasionLine(occasion, name),
      subline: subline ?? plate.subline,
      foil: plate.foil,
    })
  } catch (e) {
    // Say which file and which step. The first production failure of this route was an
    // unhandled throw that surfaced as a bare 500 HTML page, and the cause - the fonts
    // and plates not being traced into the lambda - was invisible from the outside.
    const why = e instanceof Error ? e.message : String(e)
    console.error(`[cards] compose failed for ${plate.file} (cwd ${process.cwd()}): ${why}`)
    return new Response(`could not compose the card: ${why}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    })
  }

  return new Response(new Uint8Array(img), {
    headers: {
      "Content-Type": "image/jpeg",
      // The same parameters always produce the same card, so this is safe to cache hard
      // at the edge and in every mail client that ever fetches it.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(img.length),
    },
  })
}
