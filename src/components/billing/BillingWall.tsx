"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { CreditCard, Minus, Plus, CheckCircle, Lock } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { isPast } from "@/lib/billing-ui"

const PRICE = 39
const CONTACTS_PER_SEAT = 1000
const MAX_SEATS = 100

export default function BillingWall({ seats: initialSeats, subscriptionStatus, trialEndsAt }: {
  seats: number
  subscriptionStatus: string
  trialEndsAt: string | null
}) {
  const [seats, setSeats] = useState(Math.max(1, initialSeats || 1))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trialExpired = subscriptionStatus === "trialing" && isPast(trialEndsAt)
  const headline = trialExpired
    ? "Your 14-day trial has ended"
    : subscriptionStatus === "canceled" ? "Your subscription was canceled"
    : subscriptionStatus === "past_due" || subscriptionStatus === "unpaid" ? "Payment needed"
    : "Start your subscription"

  const startCheckout = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout")
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto min-h-full flex items-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(43,168,162,0.12)" }}>
            <Lock className="w-5 h-5 text-[var(--teal)]" />
          </div>
          <div>
            <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{headline}</h1>
            <p className="text-sm text-[var(--text-muted)]">Subscribe to keep the notes going out.</p>
          </div>
        </div>

        <GlassCard className="p-6 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Rapport</p>
            <p className="text-3xl font-extrabold text-white">
              ${PRICE}<span className="text-sm font-medium text-[var(--text-muted)]"> per seat / month</span>
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                `${CONTACTS_PER_SEAT.toLocaleString()} contacts a seat, as a soft limit: never a blocked import`,
                "Birthday, renewal, closing anniversary and months-since-close notes",
                "Sent from your own Gmail or Microsoft 365 mailbox",
                "Every note held for your approval before it goes out",
                "Cancel any time from the billing portal",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <CheckCircle className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">Seats</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSeats(s => Math.max(1, s - 1))} aria-label="Fewer seats"
                className="w-9 h-9 rounded-full border border-[var(--surface-border)] flex items-center justify-center text-white hover:border-[var(--teal)]">
                <Minus className="w-4 h-4" />
              </button>
              <input type="number" min={1} max={MAX_SEATS} value={seats}
                onChange={e => setSeats(Math.min(MAX_SEATS, Math.max(1, Number(e.target.value) || 1)))}
                className="w-20 text-center bg-transparent border border-[var(--surface-border)] rounded-xl py-2 text-white font-semibold" />
              <button type="button" onClick={() => setSeats(s => Math.min(MAX_SEATS, s + 1))} aria-label="More seats"
                className="w-9 h-9 rounded-full border border-[var(--surface-border)] flex items-center justify-center text-white hover:border-[var(--teal)]">
                <Plus className="w-4 h-4" />
              </button>
              <p className="text-sm text-[var(--text-muted)] ml-2">
                {seats} seat{seats === 1 ? "" : "s"} · {(seats * CONTACTS_PER_SEAT).toLocaleString()} contacts covered
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--surface-border)] pt-5">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Total today</p>
              <p className="text-xl font-bold text-white">${(seats * PRICE).toLocaleString()}<span className="text-sm text-[var(--text-muted)]">/month</span></p>
            </div>
            <GlassButton onClick={startCheckout} loading={loading}>
              <CreditCard className="w-4 h-4" /> Start subscription
            </GlassButton>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-[11px] text-[var(--text-muted)]">Secure checkout by Stripe. You can change seats or cancel at any time.</p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
