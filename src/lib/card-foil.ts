/**
 * Foil colours, in their own module with no dependencies.
 *
 * These live apart from card-compose deliberately. card-compose imports sharp and
 * node:fs; card-plates needs only these constants, and card-plates is imported by the
 * send path, which is reachable from code that also runs in the browser. A shared helper
 * that drags a native image library into a client bundle is how a route goes blank at
 * hydration with nothing in the server logs to explain it. Constants stay portable.
 */
export type Foil = { fill: string; shadow: string }

/** Gold on a dark plate. */
export const GOLD: Foil = { fill: "#E3BE72", shadow: "rgba(0,0,0,0.55)" }
/** For blush and warm-neutral plates. */
export const ROSE_GOLD: Foil = { fill: "#E0A88E", shadow: "rgba(0,0,0,0.45)" }
/** Cream and ivory plates: bright gold disappears on them, so the foil goes darker and
 *  the shadow behind it goes light, which is how foil actually behaves on pale stock. */
export const DEEP_GOLD: Foil = { fill: "#A57B32", shadow: "rgba(255,255,255,0.35)" }
/** For very dark, very saturated plates where gold would fight the artwork. */
export const IVORY: Foil = { fill: "#F4EBDA", shadow: "rgba(0,0,0,0.5)" }
