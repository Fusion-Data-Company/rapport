import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCurrentTenant, appUrl } from "@/lib/tenant"
import { createPortalSession } from "@/lib/billing"

export const runtime = "nodejs"

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 })
  if (!tenant.stripeCustomerId) return NextResponse.json({ error: "No subscription yet" }, { status: 400 })

  try {
    const session = await createPortalSession({ tenantId: tenant.id, returnUrl: `${appUrl()}/settings/billing` })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error("Portal error:", e)
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 })
  }
}
