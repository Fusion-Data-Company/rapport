/**
 * Send events, out.
 *
 * An agent's stack is whatever they already pay for, so Rapport's job is to be easy
 * to hang things off rather than to own the workflow. Payloads are flat enough for a
 * Zapier "Catch Hook" to map without a code step, and signed so the receiver can
 * prove the request came from here.
 *
 * Delivery is one attempt with a short timeout, fired after the note is already
 * recorded as sent. A webhook must never be able to fail a send.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { db, webhookEndpoints } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { open, seal } from "@/lib/crypto"

export const WEBHOOK_EVENTS = ["note.sent", "note.held", "note.failed", "note.skipped"] as const
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export const EVENT_LABEL: Record<WebhookEvent, string> = {
  "note.sent": "A note went out",
  "note.held": "A note is waiting for approval",
  "note.failed": "A note could not be sent",
  "note.skipped": "A note was skipped",
}

export const SIGNATURE_HEADER = "x-rapport-signature"
export const EVENT_HEADER = "x-rapport-event"
export const DELIVERY_HEADER = "x-rapport-delivery"

const TIMEOUT_MS = 6000
/** After this many failures in a row the endpoint stops being tried. */
export const FAILURE_LIMIT = 20

export function newSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`
}

export function newInboundToken(): string {
  return randomBytes(18).toString("base64url")
}

/** Stripe-shaped: t=<unix seconds>,v1=<hex hmac of "t.body">. */
export function signPayload(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const mac = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
  return `t=${timestamp},v1=${mac}`
}

/** For anyone verifying on the other end, and for the tests of this file. */
export function verifySignature(secret: string, body: string, header: string, toleranceSeconds = 300): boolean {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]))
  const t = Number(parts.t)
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")
  const a = Buffer.from(parts.v1 ?? "", "hex")
  const b = Buffer.from(expected, "hex")
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b)
}

export type NotePayload = {
  event: WebhookEvent
  /** The scheduled send this is about. Stable across retries of the same event. */
  id: string
  created_at: string
  tenant_id: string
  business_name: string
  contact_id: string
  contact_first_name: string | null
  contact_last_name: string | null
  contact_email: string | null
  contact_company: string | null
  contact_tier: string | null
  occasion: string
  occasion_label: string
  subject: string | null
  body: string | null
  scheduled_date: string
  sent_at: string | null
  error: string | null
}

export function buildSecret(): { secret: string; sealed: string } {
  const secret = newSecret()
  return { secret, sealed: seal(secret) }
}

/**
 * Post one event to every active endpoint subscribed to it. Never throws, never
 * blocks the caller on a slow receiver for more than the timeout.
 */
export async function dispatch(tenantId: string, event: WebhookEvent, payload: NotePayload): Promise<void> {
  let endpoints: (typeof webhookEndpoints.$inferSelect)[]
  try {
    endpoints = await db.query.webhookEndpoints.findMany({
      where: and(eq(webhookEndpoints.tenantId, tenantId), eq(webhookEndpoints.isActive, true)),
    })
  } catch (e) {
    console.error("webhook lookup failed:", e)
    return
  }

  const body = JSON.stringify(payload)
  await Promise.all(endpoints
    .filter((ep) => !ep.events || ep.events.length === 0 || ep.events.includes(event))
    .filter((ep) => ep.consecutiveFailures < FAILURE_LIMIT)
    .map((ep) => deliverTo(ep, event, body)))
}

async function deliverTo(ep: typeof webhookEndpoints.$inferSelect, event: WebhookEvent, body: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let status: number | null = null
  let error: string | null = null
  try {
    const secret = open(ep.secretEncrypted)
    if (!secret) throw new Error("This endpoint's signing secret could not be read")
    const res = await fetch(ep.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SIGNATURE_HEADER]: signPayload(secret, body),
        [EVENT_HEADER]: event,
        [DELIVERY_HEADER]: crypto.randomUUID(),
        "User-Agent": "Rapport-Webhook/1",
      },
      body,
      signal: controller.signal,
    })
    status = res.status
    if (!res.ok) error = `${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  } finally {
    clearTimeout(timer)
  }

  await db.update(webhookEndpoints).set({
    lastStatus: status,
    lastError: error?.slice(0, 500) ?? null,
    lastAttemptAt: new Date(),
    consecutiveFailures: error ? ep.consecutiveFailures + 1 : 0,
  }).where(eq(webhookEndpoints.id, ep.id)).catch(() => undefined)
}

/** A single delivery the settings page can run on demand, with the outcome returned. */
export async function deliverOnce(ep: typeof webhookEndpoints.$inferSelect, event: WebhookEvent, payload: NotePayload) {
  const body = JSON.stringify(payload)
  await deliverTo(ep, event, body)
  const fresh = await db.query.webhookEndpoints.findFirst({ where: eq(webhookEndpoints.id, ep.id) })
  return { status: fresh?.lastStatus ?? null, error: fresh?.lastError ?? null }
}
