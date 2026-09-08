/**
 * The vocabulary of the interaction timeline, with no database import, so the
 * contact panel can use the same labels the server writes.
 */
export const TIMELINE_KINDS = ["note", "sent", "reply", "call", "meeting"] as const
export type TimelineKind = (typeof TIMELINE_KINDS)[number]

export const KIND_LABEL: Record<TimelineKind, string> = {
  note: "Note",
  sent: "Rapport sent",
  reply: "They replied",
  call: "Call",
  meeting: "Meeting",
}

/** How many entries the writer is allowed to see. More than this is noise in the prompt. */
export const HISTORY_DEPTH = 5

export function isTimelineKind(v: unknown): v is TimelineKind {
  return typeof v === "string" && (TIMELINE_KINDS as readonly string[]).includes(v)
}
