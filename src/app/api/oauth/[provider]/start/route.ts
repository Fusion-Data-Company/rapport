import { NextResponse } from "next/server"
import { requireAccess } from "@/lib/tenant"
import { authorizeUrl, isOAuthProvider, oauthConfigured, providerLabel } from "@/lib/oauth"

export const runtime = "nodejs"

/** Kick off the consent screen for the signed-in tenant's mailbox. */
export async function GET(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  if (!isOAuthProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 })
  }
  const gate = await requireAccess()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  if (!oauthConfigured(provider)) {
    return NextResponse.json({
      error: `${providerLabel(provider)} sign-in is not configured on this deployment. Connect an SMTP mailbox instead, or ask the operator to set the OAuth client id and secret.`,
    }, { status: 503 })
  }
  return NextResponse.redirect(authorizeUrl(provider, gate.tenant.id))
}
