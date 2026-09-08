/**
 * The interaction history a note is written from.
 *
 * Drafting off a static profile produces a note that reads like a mail merge with
 * better adjectives. Drafting off what actually happened - the last note that went
 * out, the reply the agent pasted back, the call they logged - is the difference
 * buyers name when they compare this category in 2026.
 */
import { db, contactTimeline } from "@/lib/db"
import { and, desc, eq } from "drizzle-orm"
import type { ContactTimelineRow } from "@/lib/types"
import { HISTORY_DEPTH, KIND_LABEL, type TimelineKind } from "@/lib/timeline-kinds"

export { TIMELINE_KINDS, KIND_LABEL, HISTORY_DEPTH, isTimelineKind } from "@/lib/timeline-kinds"
export type { TimelineKind } from "@/lib/timeline-kinds"

export async function recentTimeline(contactId: string, limit = HISTORY_DEPTH): Promise<ContactTimelineRow[]> {
  return db.query.contactTimeline.findMany({
    where: eq(contactTimeline.contactId, contactId),
    orderBy: [desc(contactTimeline.occurredAt), desc(contactTimeline.createdAt)],
    limit,
  })
}

/** Record something that happened. Never throws: history is useful, not load-bearing. */
export async function recordTimeline(entry: {
  tenantId: string
  contactId: string
  kind: TimelineKind
  body: string
  summary?: string | null
  occurredAt?: Date
  source?: "manual" | "rapport"
  scheduledSendId?: string | null
}): Promise<void> {
  try {
    await db.insert(contactTimeline).values({
      tenantId: entry.tenantId,
      contactId: entry.contactId,
      kind: entry.kind,
      summary: entry.summary?.slice(0, 200) ?? null,
      body: entry.body.slice(0, 4000),
      occurredAt: entry.occurredAt ?? new Date(),
      source: entry.source ?? "manual",
      scheduledSendId: entry.scheduledSendId ?? null,
    })
  } catch (e) {
    console.error("timeline write failed:", e)
  }
}

function daysAgo(when: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - when.getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  return months <= 1 ? "about a month ago" : `about ${months} months ago`
}

/**
 * The history block handed to the writer, oldest first so it reads as a story.
 * Trimmed hard: the model gets the gist, not a transcript.
 */
export function formatHistory(rows: ContactTimelineRow[], now = new Date()): string | null {
  if (rows.length === 0) return null
  const ordered = [...rows].reverse()
  return ordered
    .map((r) => {
      const label = KIND_LABEL[r.kind as TimelineKind] ?? "Note"
      const head = r.summary ? `${label} (${daysAgo(r.occurredAt, now)}): ${r.summary}` : `${label} (${daysAgo(r.occurredAt, now)})`
      const body = r.body.replace(/\s+/g, " ").trim().slice(0, 320)
      return body ? `- ${head} - ${body}` : `- ${head}`
    })
    .join("\n")
}

/** The last thing that went out, so the writer does not repeat itself. */
export async function lastSent(contactId: string, tenantId: string): Promise<ContactTimelineRow | null> {
  const row = await db.query.contactTimeline.findFirst({
    where: and(
      eq(contactTimeline.contactId, contactId),
      eq(contactTimeline.tenantId, tenantId),
      eq(contactTimeline.kind, "sent"),
    ),
    orderBy: [desc(contactTimeline.occurredAt)],
  })
  return row ?? null
}
