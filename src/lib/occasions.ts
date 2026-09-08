/**
 * What is due, and when.
 *
 * One place decides that today is Dana's policy-renewal note and that Luis crossed
 * six months since closing, so the morning cron and the schedule preview can never
 * disagree about what is coming.
 *
 * Birthdays are a courtesy. Renewals, closing anniversaries and the months-since-close
 * check-ins are the dates a book of business actually turns on, which is why they are
 * first-class here rather than a tag someone has to remember to set.
 */
import {
  addDays, addMonths, formatLongDate, monthDay, todayISO, yearsBetween, type ISODate,
} from "@/lib/dates"
import type { ContactChildRow, ContactDateRow, ContactRow } from "@/lib/types"

export type OccasionType =
  | "birthday"
  | "anniversary"
  | "child_birthday"
  | "policy_renewal"
  | "loan_anniversary"
  | "home_anniversary"
  | "months_since_close"
  | "custom_date"
  | "sports_win"
  | "sports_loss"
  | "review_request"

export const OCCASION_LABELS: Record<OccasionType, string> = {
  birthday: "Birthday",
  anniversary: "Wedding anniversary",
  child_birthday: "Child's birthday",
  policy_renewal: "Policy renewal",
  loan_anniversary: "Loan anniversary",
  home_anniversary: "Home anniversary",
  months_since_close: "Months since close",
  custom_date: "Custom date",
  sports_win: "Their team won",
  sports_loss: "Their team lost",
  review_request: "Review request",
}

/** The money dates, in the order an agent thinks about them. */
export const MONEY_OCCASIONS: OccasionType[] = [
  "policy_renewal", "loan_anniversary", "home_anniversary", "months_since_close",
]

export const DEFAULT_MILESTONE_MONTHS = [3, 6, 12]
export const DEFAULT_RENEWAL_LEAD_DAYS = 30
export const DEFAULT_REVIEW_REQUEST_DAYS = 30

export type ContactForOccasions = ContactRow & {
  children?: ContactChildRow[]
  customDates?: ContactDateRow[]
}

export type TenantOccasionSettings = {
  renewalLeadDays?: number | null
  milestoneMonths?: number[] | null
  googleReviewUrl?: string | null
  reviewRequestDays?: number | null
}

export type DueOccasion = {
  contactId: string
  type: OccasionType
  /** What the agent sees on the card: "Policy renews March 14". */
  label: string
  /** The day the note should go out. */
  sendDate: ISODate
  /** The date the note is about, when that is not the send date. */
  eventDate?: ISODate
  /** One line handed to the writer as the reason for the note. */
  prompt: string
  /** Appended to the drafted body verbatim. A review link has to survive the model. */
  appendix?: string
  childName?: string
}

function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export function milestoneMonthsFor(t: TenantOccasionSettings): number[] {
  const raw = t.milestoneMonths
  if (!raw || raw.length === 0) return DEFAULT_MILESTONE_MONTHS
  return raw.filter((m) => Number.isInteger(m) && m > 0 && m <= 120).slice(0, 8)
}

/** Days after a closing to ask for a review, or null when the ask is off. */
export function reviewRequestDaysFor(t: TenantOccasionSettings): number | null {
  if (!t.googleReviewUrl?.trim()) return null
  const n = t.reviewRequestDays
  if (n === 0) return null
  if (n == null || !Number.isInteger(n) || n < 1 || n > 365) return DEFAULT_REVIEW_REQUEST_DAYS
  return n
}

export function renewalLeadDaysFor(t: TenantOccasionSettings): number {
  const n = t.renewalLeadDays
  if (n == null || !Number.isInteger(n) || n < 0 || n > 180) return DEFAULT_RENEWAL_LEAD_DAYS
  return n
}

/**
 * Everything due for one contact on one day. The send date is always `on`; an
 * occasion that anticipates a future date (a renewal) carries that date separately.
 */
export function occasionsForDay(
  contact: ContactForOccasions,
  settings: TenantOccasionSettings,
  on: ISODate = todayISO(),
  /** True when this contact has already been asked for a review. Asked once, ever. */
  alreadyAskedForReview = false,
): DueOccasion[] {
  if (contact.status !== "active" || contact.unsubscribed) return []

  const out: DueOccasion[] = []
  const md = monthDay(on)
  const first = contact.nickname?.trim() || contact.firstName

  if (md && monthDay(contact.birthdate) === md) {
    out.push({
      contactId: contact.id, type: "birthday", sendDate: on, eventDate: on,
      label: `${possessive(first)} birthday`,
      prompt: `It is ${possessive(first)} birthday today.`,
    })
  }

  if (md && monthDay(contact.anniversary) === md) {
    const years = contact.anniversary ? yearsBetween(contact.anniversary, on) : 0
    out.push({
      contactId: contact.id, type: "anniversary", sendDate: on, eventDate: on,
      label: years > 0 ? `Wedding anniversary, ${years} years` : "Wedding anniversary",
      prompt: years > 0
        ? `Today is ${possessive(first)} ${ordinal(years)} wedding anniversary${contact.spouseName ? ` with ${contact.spouseName}` : ""}.`
        : `Today is ${possessive(first)} wedding anniversary.`,
    })
  }

  for (const child of contact.children ?? []) {
    if (!md || monthDay(child.birthdate) !== md) continue
    const age = child.birthdate ? yearsBetween(child.birthdate, on) : null
    out.push({
      contactId: contact.id, type: "child_birthday", sendDate: on, eventDate: on, childName: child.name,
      label: `${possessive(child.name)} birthday`,
      prompt: age && age > 0 && !child.birthdateYearUnknown
        ? `${possessive(first)} child ${child.name} turns ${age} today. Write to ${first} about it, not to the child.`
        : `${possessive(first)} child ${child.name} has a birthday today. Write to ${first} about it, not to the child.`,
    })
  }

  // Policy renewal: the note goes out ahead of the date, because after it renews the
  // conversation is a claim, not a sale.
  const lead = renewalLeadDaysFor(settings)
  const renewalTarget = addDays(on, lead)
  if (contact.policyRenewalDate && monthDay(contact.policyRenewalDate) === monthDay(renewalTarget)) {
    const policy = contact.policyType?.trim()
    out.push({
      contactId: contact.id, type: "policy_renewal", sendDate: on, eventDate: renewalTarget,
      label: `${policy ? `${policy} renews` : "Policy renews"} ${formatLongDate(renewalTarget)}`,
      prompt: lead > 0
        ? `${possessive(first)} ${policy ?? "policy"} renews on ${formatLongDate(renewalTarget)}, ${lead} days from now. Mention the renewal warmly and offer to look at it together. Do not quote a price or make any coverage claim.`
        : `${possessive(first)} ${policy ?? "policy"} renews today. Mention it warmly and offer to look at it together. Do not quote a price or make any coverage claim.`,
    })
  }

  if (contact.loanClosedDate && md && monthDay(contact.loanClosedDate) === md) {
    const years = yearsBetween(contact.loanClosedDate, on)
    if (years >= 1) {
      const loan = contact.loanType?.trim()
      out.push({
        contactId: contact.id, type: "loan_anniversary", sendDate: on, eventDate: on,
        label: `${years} ${years === 1 ? "year" : "years"} since closing`,
        prompt: `Today is ${years} ${years === 1 ? "year" : "years"} since ${first} closed${loan ? ` their ${loan}` : ""}. Congratulate them on the anniversary. Do not mention rates or refinancing numbers.`,
      })
    }
  }

  if (contact.homePurchaseDate && md && monthDay(contact.homePurchaseDate) === md) {
    const years = yearsBetween(contact.homePurchaseDate, on)
    if (years >= 1) {
      out.push({
        contactId: contact.id, type: "home_anniversary", sendDate: on, eventDate: on,
        label: `${years} ${years === 1 ? "year" : "years"} in the house`,
        prompt: `Today is ${possessive(first)} ${ordinal(years)} anniversary in their home. A short congratulations, nothing salesy.`,
      })
    }
  }

  // "N months since close" - the check-in that keeps a closed file warm.
  const closeDate = contact.loanClosedDate ?? contact.homePurchaseDate
  if (closeDate) {
    for (const months of milestoneMonthsFor(settings)) {
      if (addMonths(closeDate, months) !== on) continue
      out.push({
        contactId: contact.id, type: "months_since_close", sendDate: on, eventDate: on,
        label: `${months} months since close`,
        prompt: `It has been ${months} months since ${first} closed. Check in on how it is going and ask whether anything has changed. Do not pitch.`,
      })
      break // one milestone can land on a day; the first match is the note
    }
  }

  // The review ask, a set number of days after the closing, and only once ever. Every
  // insurance comp has this; the difference is that here it rides the same approval
  // queue as everything else, so nobody is asked at a bad moment.
  const reviewDays = reviewRequestDaysFor(settings)
  if (reviewDays !== null && closeDate && !alreadyAskedForReview && addDays(closeDate, reviewDays) === on) {
    out.push({
      contactId: contact.id, type: "review_request", sendDate: on, eventDate: on,
      label: `Review request, ${reviewDays} days after closing`,
      prompt: `${first} closed with you ${reviewDays} days ago. Ask, once and lightly, whether they would leave a short Google review. Two sentences at most. Do not include a link or a URL; one is added under your note. Do not offer anything in exchange for a review.`,
      appendix: `Here is the link, it takes a minute: ${settings.googleReviewUrl?.trim()}`,
    })
  }

  // Custom dates. Several on one day are merged, because a contact gets one note a day.
  const customToday = (contact.customDates ?? []).filter((d) => {
    if (!d.isActive) return false
    if (d.recurrence === "once") return d.date === on
    return md != null && monthDay(d.date) === md
  })
  if (customToday.length > 0) {
    const labels = customToday.map((d) => d.label.trim()).filter(Boolean)
    const notes = customToday.map((d) => d.notes?.trim()).filter(Boolean)
    out.push({
      contactId: contact.id, type: "custom_date", sendDate: on, eventDate: on,
      label: labels.join(", ") || "Custom date",
      prompt: `Today is ${labels.join(" and ")} for ${first}.${notes.length ? ` Context: ${notes.join(" ")}` : ""}`,
    })
  }

  return out
}

/** Everything due for a book across a window, oldest first. Used by the schedule preview. */
export function projectOccasions(
  contactList: ContactForOccasions[],
  settings: TenantOccasionSettings,
  opts: { from?: ISODate; days?: number; askedForReview?: Set<string> } = {},
): DueOccasion[] {
  const from = opts.from ?? todayISO()
  const days = Math.min(Math.max(opts.days ?? 30, 1), 120)
  const out: DueOccasion[] = []
  for (let i = 0; i < days; i++) {
    const day = addDays(from, i)
    for (const c of contactList) {
      out.push(...occasionsForDay(c, settings, day, opts.askedForReview?.has(c.id) ?? false))
    }
  }
  return out.sort((a, b) => (a.sendDate < b.sendDate ? -1 : a.sendDate > b.sendDate ? 1 : 0))
}

/** Contacts already asked for a review, so nobody is asked twice. */
export const REVIEW_OCCASION: OccasionType = "review_request"
