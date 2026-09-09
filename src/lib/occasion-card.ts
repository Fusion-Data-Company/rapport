/**
 * The card that goes out with an occasion, when the send row has not got one of
 * its own yet.
 *
 * A projected send — an occasion the cron has not written a row for — has no
 * card_image_url, and a queue whose rows show a grey box is a queue nobody
 * trusts. Every occasion the scheduler can raise has a Rapport card shipped in
 * public/img/cards, so the fallback is the real artefact rather than a
 * placeholder.
 */
const SYSTEM_CARD: Record<string, string> = {
  birthday: "birthday",
  anniversary: "anniversary",
  child_birthday: "child-birthday",
  policy_renewal: "policy-renewal",
  home_anniversary: "home-anniversary",
  loan_anniversary: "loan-anniversary",
  months_since_close: "months-since-close",
  review_request: "review-request",
}

/** Full-size card for a preview. */
export function cardFor(occasionType: string, sent?: string | null): string {
  if (sent) return sent
  return `/img/cards/${SYSTEM_CARD[occasionType] ?? "birthday"}.jpg`
}

/** The 4:5 thumbnail used in a list row. */
export function cardThumbFor(occasionType: string, sent?: string | null): string {
  if (sent) return sent
  return `/img/cards/${SYSTEM_CARD[occasionType] ?? "birthday"}-thumb.jpg`
}
