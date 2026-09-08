/**
 * Calendar helpers. Everything here works on "YYYY-MM-DD" strings, because that is
 * what a Postgres `date` column hands back and because a Date object drags a timezone
 * along that turns a birthday into the day before for half the country.
 */

export type ISODate = string // YYYY-MM-DD

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

export function isISODate(v: unknown): v is ISODate {
  return typeof v === "string" && ISO.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
}

export function todayISO(now = new Date()): ISODate {
  return now.toISOString().slice(0, 10)
}

/** "03-14" for sorting and matching a recurring day, year ignored. */
export function monthDay(d: ISODate | null | undefined): string | null {
  if (!d || !ISO.test(d)) return null
  return d.slice(5, 10)
}

export function yearOf(d: ISODate): number {
  return Number(d.slice(0, 4))
}

export function addDays(d: ISODate, n: number): ISODate {
  const t = Date.parse(`${d}T00:00:00Z`) + n * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

/** Calendar month arithmetic that clamps: 2025-01-31 plus one month is 2025-02-28. */
export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split("-").map(Number)
  const target = new Date(Date.UTC(y, m - 1 + n, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

/** Whole years from `from` to `to`, by calendar. */
export function yearsBetween(from: ISODate, to: ISODate): number {
  let years = yearOf(to) - yearOf(from)
  if (to.slice(5) < from.slice(5)) years--
  return years
}

/** The next occurrence of a month and day, on or after `from`. */
export function nextAnniversary(source: ISODate, from: ISODate): ISODate {
  const md = source.slice(5)
  const candidate = `${yearOf(from)}-${md}`
  return candidate >= from ? candidate : `${yearOf(from) + 1}-${md}`
}

export function formatLongDate(d: ISODate): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

/**
 * Best effort read of a date out of a CSV cell. Real AMS and CRM exports hand back
 * "3/15/2024", "2024-03-15", "15-Mar-2024" and "March 15, 2024" in the same file.
 * Ambiguous day-first formats are read US-style, which is what these exports mean.
 * Returns null rather than guessing when it cannot tell.
 */
export function parseDateInput(raw: unknown): ISODate | null {
  if (raw == null) return null
  const v = String(raw).trim()
  if (!v) return null

  if (ISO.test(v)) return isISODate(v) ? v : null

  // 3/15/2024, 03-15-24, 3.15.2024
  const numeric = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(v)
  if (numeric) {
    const [, a, b, c] = numeric
    const year = c.length === 2 ? 2000 + Number(c) : Number(c)
    return build(year, Number(a), Number(b))
  }

  // 15-Mar-2024, Mar 15 2024, March 15, 2024
  const named = /^(\d{1,2})[\s\-]*([a-z]{3,})[\s\-]*(\d{2,4})$/i.exec(v)
    ?? /^([a-z]{3,})[\s.]*(\d{1,2}),?[\s]*(\d{2,4})$/i.exec(v)
  if (named) {
    const parts = named.slice(1)
    const monthPart = parts.find((p) => /^[a-z]/i.test(p)) ?? ""
    const numbers = parts.filter((p) => /^\d+$/.test(p)).map(Number)
    const month = MONTHS.indexOf(monthPart.slice(0, 3).toLowerCase()) + 1
    if (month > 0 && numbers.length === 2) {
      const [day, year] = numbers[1] > 31 ? [numbers[0], numbers[1]] : [numbers[1], numbers[0]]
      return build(year < 100 ? 2000 + year : year, month, day)
    }
  }
  return null
}

function build(year: number, month: number, day: number): ISODate | null {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  // Reject 2025-02-30 and friends.
  const d = new Date(`${iso}T00:00:00Z`)
  return d.getUTCMonth() + 1 === month && d.getUTCDate() === day ? iso : null
}
