/**
 * Secrets at rest. Tenant SMTP passwords and LLM API keys are encrypted with
 * AES-256-GCM under ENCRYPTION_KEY (32 bytes, base64 or hex). Ciphertext is
 * stored as "enc:v1:<iv>:<tag>:<data>" so a value written before this existed
 * (plain text) still reads: `open()` returns it unchanged when it has no prefix.
 * Without ENCRYPTION_KEY, `seal()` refuses rather than silently storing plain text.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const PREFIX = "enc:v1:"

function key(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY?.trim()
  if (!raw) return null
  const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64")
  return buf.length === 32 ? buf : null
}

export function encryptionConfigured(): boolean {
  return key() !== null
}

export function seal(plain: string): string {
  const k = key()
  if (!k) throw new Error("ENCRYPTION_KEY is not set (32 bytes, base64 or hex); refusing to store a secret in plain text")
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", k, iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`
}

export function open(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (!stored.startsWith(PREFIX)) return stored // legacy plain-text row
  const k = key()
  if (!k) throw new Error("ENCRYPTION_KEY is not set; cannot read a stored secret")
  const [iv, tag, data] = stored.slice(PREFIX.length).split(":")
  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8")
}

export function isSealed(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(PREFIX)
}
