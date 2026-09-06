import { NextResponse } from "next/server"
import { stripe, handleStripeEvent } from "@/lib/billing"

export const runtime = "nodejs"
// Stripe needs the raw, unmodified body for signature verification.
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 500 })

  const sig = req.headers.get("stripe-signature")
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })

  const rawBody = await req.text()
  let event
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, secret)
  } catch (e) {
    console.error("Stripe signature verification failed:", e)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    await handleStripeEvent(event)
    return NextResponse.json({ received: true })
  } catch (e) {
    console.error(`Stripe event ${event.type} failed:`, e)
    // 500 so Stripe retries.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }
}
