/**
 * Gmail and Microsoft 365 OAuth for the sending mailbox.
 *
 * Rapport's whole pitch is that a note arrives from the rep's real address. Asking a
 * solo agent to generate a Google app password is where that pitch dies, so the first
 * choice is a normal "Sign in with Google" / "Sign in with Microsoft" consent screen
 * that grants send-only access. SMTP stays as the fallback for mailboxes neither
 * provider covers.
 *
 * Only the refresh token is stored, sealed with the app's ENCRYPTION_KEY. Access
 * tokens are exchanged on demand and never written down.
 *
 * When GOOGLE_OAUTH_CLIENT_ID / MS_OAUTH_CLIENT_ID are unset the provider is simply
 * reported as unavailable; nothing throws and SMTP still works.
 */
import { createHmac, timingSafeEqual } from "node:crypto"
import { appUrl } from "@/lib/tenant"

export type OAuthProvider = "google" | "microsoft"

export const OAUTH_PROVIDERS: OAuthProvider[] = ["google", "microsoft"]

export function isOAuthProvider(v: string): v is OAuthProvider {
  return v === "google" || v === "microsoft"
}

type ProviderSpec = {
  label: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientId: () => string | undefined
  clientSecret: () => string | undefined
  /** Extra params on the consent URL that make the provider hand back a refresh token. */
  authorizeExtras: Record<string, string>
}

const SPECS: Record<OAuthProvider, ProviderSpec> = {
  google: {
    label: "Google Workspace / Gmail",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    // gmail.send only: Rapport can send as the user and can read nothing.
    scopes: ["https://www.googleapis.com/auth/gmail.send", "openid", "email"],
    clientId: () => process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    // No include_granted_scopes. Incremental authorisation makes Google merge every
    // scope this account has ever granted anywhere in the Cloud project into the
    // request, and a project that also holds YouTube or Drive grants then fails with
    // "scopes that cannot be requested together". Rapport wants exactly one scope.
    authorizeExtras: { access_type: "offline", prompt: "consent" },
  },
  microsoft: {
    label: "Microsoft 365 / Outlook",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["https://graph.microsoft.com/Mail.Send", "https://graph.microsoft.com/User.Read", "offline_access", "openid", "email"],
    clientId: () => process.env.MS_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.MS_OAUTH_CLIENT_SECRET,
    authorizeExtras: { prompt: "consent", response_mode: "query" },
  },
}

export function providerLabel(p: OAuthProvider): string {
  return SPECS[p].label
}

/** True when this deployment has credentials for the provider. */
export function oauthConfigured(p: OAuthProvider): boolean {
  const s = SPECS[p]
  return !!(s.clientId() && s.clientSecret())
}

export function redirectUri(p: OAuthProvider): string {
  return `${appUrl()}/api/oauth/${p}/callback`
}

// ── State ────────────────────────────────────────────────────────────────────
// The callback arrives without a session guarantee, so the tenant id travels in a
// signed, short-lived state parameter rather than a cookie we would have to trust.

function stateSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || process.env.ENCRYPTION_KEY || "rapport-oauth"
}

const STATE_TTL_MS = 15 * 60 * 1000

export function signState(tenantId: string): string {
  const payload = `${tenantId}.${Date.now()}`
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url")
  return `${Buffer.from(payload).toString("base64url")}.${sig}`
}

export function verifyState(state: string | null): { tenantId: string } | null {
  if (!state) return null
  const [b64, sig] = state.split(".")
  if (!b64 || !sig) return null
  let payload: string
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8")
  } catch {
    return null
  }
  const expected = createHmac("sha256", stateSecret()).update(payload).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const [tenantId, issued] = payload.split(".")
  if (!tenantId || !issued) return null
  if (Date.now() - Number(issued) > STATE_TTL_MS) return null
  return { tenantId }
}

// ── Consent + token exchange ─────────────────────────────────────────────────

export function authorizeUrl(p: OAuthProvider, tenantId: string): string {
  const s = SPECS[p]
  const url = new URL(s.authorizeUrl)
  url.searchParams.set("client_id", s.clientId() ?? "")
  url.searchParams.set("redirect_uri", redirectUri(p))
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", s.scopes.join(" "))
  url.searchParams.set("state", signState(tenantId))
  for (const [k, v] of Object.entries(s.authorizeExtras)) url.searchParams.set(k, v)
  return url.toString()
}

export type TokenSet = {
  accessToken: string
  refreshToken?: string
  expiresInSeconds: number
  idToken?: string
  scope?: string
}

async function postToken(p: OAuthProvider, body: Record<string, string>): Promise<TokenSet> {
  const s = SPECS[p]
  const res = await fetch(s.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: s.clientId() ?? "", client_secret: s.clientSecret() ?? "", ...body }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${providerLabel(p)} rejected the sign-in: ${text.slice(0, 300)}`)
  }
  const json = JSON.parse(text) as {
    access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; scope?: string
  }
  if (!json.access_token) throw new Error(`${providerLabel(p)} returned no access token`)
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresInSeconds: json.expires_in ?? 3600,
    idToken: json.id_token,
    scope: json.scope,
  }
}

export function exchangeCode(p: OAuthProvider, code: string): Promise<TokenSet> {
  return postToken(p, { grant_type: "authorization_code", code, redirect_uri: redirectUri(p) })
}

export function refreshAccessToken(p: OAuthProvider, refreshToken: string): Promise<TokenSet> {
  return postToken(p, { grant_type: "refresh_token", refresh_token: refreshToken })
}

/** The address the mailbox sends from. Read from the id_token when present, else the provider's profile. */
export async function mailboxAddress(p: OAuthProvider, tokens: TokenSet): Promise<string | null> {
  const fromId = tokens.idToken ? emailFromIdToken(tokens.idToken) : null
  if (fromId) return fromId
  try {
    if (p === "google") {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tokens.accessToken}` } })
      if (!r.ok) return null
      const j = (await r.json()) as { email?: string }
      return j.email ?? null
    }
    const r = await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${tokens.accessToken}` } })
    if (!r.ok) return null
    const j = (await r.json()) as { mail?: string; userPrincipalName?: string }
    return j.mail ?? j.userPrincipalName ?? null
  } catch {
    return null
  }
}

function emailFromIdToken(idToken: string): string | null {
  const part = idToken.split(".")[1]
  if (!part) return null
  try {
    const claims = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { email?: string; preferred_username?: string }
    const value = claims.email ?? claims.preferred_username
    return value && value.includes("@") ? value : null
  } catch {
    return null
  }
}
