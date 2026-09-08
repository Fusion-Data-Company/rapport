import { NextResponse } from "next/server"
import { db, tenantEmailConfig, tenants } from "@/lib/db"
import { eq } from "drizzle-orm"
import { seal } from "@/lib/crypto"
import { ensureSchema } from "@/lib/db/ensure"
import { appUrl } from "@/lib/tenant"
import { exchangeCode, isOAuthProvider, mailboxAddress, verifyState } from "@/lib/oauth"
import { DEFAULT_DAILY_CAP } from "@/lib/send-caps"

export const runtime = "nodejs"

function back(message: string, ok: boolean) {
  const url = new URL("/settings/email", appUrl())
  url.searchParams.set(ok ? "connected" : "error", message)
  return NextResponse.redirect(url)
}

/** The provider sends the agent back here with a code. Trade it for a refresh token and store it sealed. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  if (!isOAuthProvider(provider)) return back("Unknown provider", false)

  const url = new URL(req.url)
  const denied = url.searchParams.get("error")
  if (denied) return back(denied === "access_denied" ? "You cancelled the mailbox connection." : denied, false)

  const code = url.searchParams.get("code")
  const state = verifyState(url.searchParams.get("state"))
  if (!code || !state) return back("That sign-in link expired. Start the connection again.", false)

  try {
    await ensureSchema()
    const tokens = await exchangeCode(provider, code)
    if (!tokens.refreshToken) {
      return back(`${provider === "google" ? "Google" : "Microsoft"} did not return a refresh token. Remove Rapport from your account's connected apps and try once more so the consent screen shows again.`, false)
    }
    const address = await mailboxAddress(provider, tokens)

    const values = {
      provider,
      oauthEmail: address,
      oauthRefreshTokenEncrypted: seal(tokens.refreshToken),
      oauthScope: tokens.scope ?? null,
      oauthConnectedAt: new Date(),
      warmupStartedAt: new Date(),
      isVerified: true,
      // A mailbox switch clears the old SMTP secret rather than leaving it lying around.
      smtpPasswordEncrypted: null,
      updatedAt: new Date(),
    }
    const existing = await db.query.tenantEmailConfig.findFirst({ where: eq(tenantEmailConfig.tenantId, state.tenantId) })
    if (existing) {
      await db.update(tenantEmailConfig).set(values).where(eq(tenantEmailConfig.tenantId, state.tenantId))
    } else {
      await db.insert(tenantEmailConfig).values({ tenantId: state.tenantId, dailyCap: DEFAULT_DAILY_CAP, ...values })
    }

    // The mailbox is the sender: point the tenant's from-address at it when it is unset or a placeholder.
    if (address) {
      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, state.tenantId) })
      if (tenant && (!tenant.fromEmail || tenant.fromEmail.endsWith("@example.com"))) {
        await db.update(tenants).set({ fromEmail: address }).where(eq(tenants.id, state.tenantId))
      }
    }
    return back(address ?? "your mailbox", true)
  } catch (e) {
    console.error("OAuth callback failed:", e)
    return back(e instanceof Error ? e.message.slice(0, 200) : "The mailbox connection failed.", false)
  }
}
