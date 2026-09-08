/**
 * Deliverability guardrails for a sending mailbox.
 *
 * A brand new mailbox that suddenly sends 200 personal notes in a morning is a
 * spam signal, and the whole product depends on those notes reaching the inbox.
 * So: a hard per-mailbox daily cap the agent sets (default 40), and a warm-up ramp
 * that starts lower for the first two weeks after the mailbox is connected.
 */
import { db, scheduledSends } from "@/lib/db"
import { and, eq, gte, inArray, sql } from "drizzle-orm"

export const DEFAULT_DAILY_CAP = 40
export const MIN_DAILY_CAP = 1
export const MAX_DAILY_CAP = 500

/** The ramp, by day since the mailbox was connected. Day 1 is the day it was connected. */
export const WARMUP_RAMP: { throughDay: number; cap: number }[] = [
  { throughDay: 3, cap: 10 },
  { throughDay: 7, cap: 20 },
  { throughDay: 14, cap: 30 },
]

export function clampDailyCap(n: unknown): number {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v)) return DEFAULT_DAILY_CAP
  return Math.min(MAX_DAILY_CAP, Math.max(MIN_DAILY_CAP, v))
}

export function daysSince(start: Date | null | undefined, now = new Date()): number | null {
  if (!start) return null
  const ms = now.getTime() - start.getTime()
  if (ms < 0) return 1
  return Math.floor(ms / 86_400_000) + 1
}

/** The warm-up ceiling on a given day, or null once the mailbox is past the ramp. */
export function warmupCap(warmupStartedAt: Date | null | undefined, now = new Date()): number | null {
  const day = daysSince(warmupStartedAt, now)
  if (day === null) return null
  for (const step of WARMUP_RAMP) if (day <= step.throughDay) return step.cap
  return null
}

export type CapState = {
  /** What the agent set. */
  dailyCap: number
  /** What actually applies today, once warm-up is taken into account. */
  effectiveCap: number
  /** Non-null while the mailbox is still ramping. */
  warmupCap: number | null
  warmupDay: number | null
  sentToday: number
  remaining: number
}

/** Notes already delivered today for this tenant. */
export async function sentToday(tenantId: string, today = new Date().toISOString().split("T")[0]): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(scheduledSends)
    .where(and(
      eq(scheduledSends.tenantId, tenantId),
      eq(scheduledSends.status, "sent"),
      gte(scheduledSends.sentAt, new Date(`${today}T00:00:00.000Z`)),
    ))
  return Number(rows[0]?.n ?? 0)
}

export async function capState(opts: {
  tenantId: string
  dailyCap?: number | null
  warmupStartedAt?: Date | null
  now?: Date
}): Promise<CapState> {
  const now = opts.now ?? new Date()
  const dailyCap = clampDailyCap(opts.dailyCap ?? DEFAULT_DAILY_CAP)
  const warm = warmupCap(opts.warmupStartedAt, now)
  const effectiveCap = warm === null ? dailyCap : Math.min(dailyCap, warm)
  const already = await sentToday(opts.tenantId, now.toISOString().split("T")[0])
  return {
    dailyCap,
    effectiveCap,
    warmupCap: warm,
    warmupDay: daysSince(opts.warmupStartedAt, now),
    sentToday: already,
    remaining: Math.max(0, effectiveCap - already),
  }
}

/** Rows the cron pushed past the cap are parked, not failed: they go out on the next run. */
export async function deferOverCap(sendIds: string[]) {
  if (sendIds.length === 0) return
  await db.update(scheduledSends)
    .set({ status: "deferred", errorMessage: "Held back by today's mailbox send cap; goes out on the next run." })
    .where(inArray(scheduledSends.id, sendIds))
}
