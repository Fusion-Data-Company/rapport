import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCurrentTenant, getCurrentUserEmail, appUrl } from "@/lib/tenant"
import { createCheckoutSession, clampSeats } from "@/lib/billing"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: "No tenant - complete onboarding first" }, { status: 400 })

  let seats = 1
  try {
    const body = await req.json()
    seats = clampSeats(body?.seats ?? 1)
  } catch { /* empty body → 1 seat */ }

  try {
    const base = appUrl()
    const session = await createCheckoutSession({
      tenantId: tenant.id,
      seats,
      successUrl: `${base}/settings/billing?checkout=success`,
      cancelUrl: `${base}/billing?checkout=canceled`,
      customerEmail: await getCurrentUserEmail(),
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error("Checkout error:", e)
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 })
  }
}
