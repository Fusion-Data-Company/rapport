import { createHmac, timingSafeEqual } from "crypto"
import { appUrl } from "@/lib/tenant"

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET
  if (!s) throw new Error("UNSUBSCRIBE_SECRET (or CRON_SECRET) must be set")
  return s
}

export function unsubscribeToken(contactId: string): string {
  return createHmac("sha256", secret()).update(contactId).digest("hex")
}

export function verifyUnsubscribeToken(contactId: string, token: string): boolean {
  if (!contactId || !token) return false
  const expected = Buffer.from(unsubscribeToken(contactId), "hex")
  let given: Buffer
  try { given = Buffer.from(token, "hex") } catch { return false }
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export function unsubscribeUrl(contactId: string): string {
  return `${appUrl()}/api/unsubscribe?c=${encodeURIComponent(contactId)}&t=${unsubscribeToken(contactId)}`
}
