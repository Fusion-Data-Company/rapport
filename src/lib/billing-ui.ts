/** Whole days from now until `d` (never negative). Null when there is no date. */
export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime()
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000))
}

export function isPast(d: Date | string | null | undefined): boolean {
  if (!d) return false
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime()
  return t < Date.now()
}
