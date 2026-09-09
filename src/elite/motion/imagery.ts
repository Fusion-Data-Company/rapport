/**
 * The plate registry. Each product fills this with its OWN photography, then
 * everything in ./motion — PlateShow, HeroVideo, UnmaskImage, Pinned,
 * KenBurns — works unchanged. This file is the only thing inside motion/ that
 * a product must edit to adopt the kit. See ../example/imagery.ts for a
 * filled one.
 *
 * A plate is one photograph plus the metadata that keeps it from being the
 * worst thing on the page.
 */
export type Plate = {
  /** Path under /public, or any absolute URL. */
  src: string
  /**
   * object-position, e.g. "50% 35%". Keeps the subject in frame when cropped.
   * Not optional in practice: `object-fit: cover` on a 16:9 source in a tall
   * phone viewport crops roughly 40% of the width away, from BOTH edges, so a
   * subject sitting at 62% of the frame is gone unless the focal says to hold it.
   */
  focal?: string
  /** Alt text. Write it for a person who cannot see the image. */
  alt: string
  /**
   * A tiny inline placeholder — a data: URI or a solid colour — painted under
   * the plate until it decodes. Without one, a full-bleed hero flashes the
   * page ground for as long as the photograph takes on a slow connection,
   * which is the single most visible loading defect a marketing page has.
   */
  lqip?: string
  /**
   * Intrinsic pixel dimensions. Supplied so the <img> can carry width/height
   * and reserve its own box: a full-bleed hero without them is the largest
   * layout shift on the page and it lands after the fold has been read.
   */
  w?: number
  h?: number
}

/* Rapport's own plates. Two photographs and eight cards the generator
   actually made — the cards are the product's artefact and the whole of its
   argument, so they are registered here like any other plate. */
export const PLATES = {
  desk: {
    src: "/img/hero-desk.jpg",
    focal: "52% 46%",
    alt: "An agent's desk at the end of the day: the client book open, a note signed by hand, the calendar still up on the laptop.",
    w: 1600, h: 893,
    lqip: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23132339'/%3E%3C/svg%3E",
  },
  flow: {
    src: "/img/how-it-works.jpg",
    focal: "50% 50%",
    alt: "Five steps: import your book, dates are watched, a note is drafted, you approve it, it is sent from your inbox.",
    w: 1600, h: 575,
    lqip: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%230a1420'/%3E%3C/svg%3E",
  },
  cardRob: {
    src: "/img/cards/examples/runtime-rob.jpg",
    focal: "50% 50%",
    alt: "A birthday card in foil script reading Happy Birthday, Rob, a golden retriever puppy in the wreath.",
  },
  cardMaddie: {
    src: "/img/cards/examples/runtime-maddie.jpg",
    focal: "50% 50%",
    alt: "A birthday card in foil script reading Happy Birthday, Maddie, a horseshoe among the confetti.",
  },
} as Record<string, Plate>
export type PlateKey = keyof typeof PLATES
