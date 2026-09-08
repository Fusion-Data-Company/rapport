"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import { CalendarClock, Loader2, ShieldCheck, Layers, Star } from "lucide-react"
import { TIERS, TIER_HINT, TIER_LABEL, type Tier } from "@/lib/tier-labels"
import type { CadenceSettings } from "@/app/api/settings/cadence/route"

const LEAD_PRESETS = [0, 14, 30, 45, 60]

export default function CadenceSettingsPage() {
  const qc = useQueryClient()
  const q = useQuery<CadenceSettings>({ queryKey: ["cadence"], queryFn: () => fetch("/api/settings/cadence").then(r => r.json()) })
  const [milestoneDraft, setMilestoneDraft] = useState<string | null>(null)
  const [tierDraft, setTierDraft] = useState<Partial<Record<Tier, string>>>({})
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const [reviewDays, setReviewDays] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const save = useMutation({
    mutationFn: async (body: {
      renewalLeadDays?: number
      milestoneMonths?: number[]
      alwaysReview?: boolean
      tierDays?: Partial<Record<Tier, number>>
      googleReviewUrl?: string
      reviewRequestDays?: number
    }) => {
      const r = await fetch("/api/settings/cadence", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not save")
      return d
    },
    onSuccess: () => {
      setMsg({ ok: true, text: "Saved." })
      setMilestoneDraft(null); setTierDraft({}); setReviewUrl(null); setReviewDays(null)
      qc.invalidateQueries({ queryKey: ["cadence"] })
    },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  const s = q.data
  const milestoneValue = milestoneDraft ?? (s?.milestoneMonths ?? []).join(", ")

  return (
    <div className="p-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <CalendarClock className="w-5 h-5 text-[var(--gold)]" />
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Timing</h1>
          <p className="text-sm text-[var(--text-muted)]">When the money dates fire. Birthdays and anniversaries always go out on the day.</p>
        </div>
      </div>

      {msg && (
        <GlassCard className={`p-4 mb-4 ${msg.ok ? "border-[var(--teal)]" : "border-[var(--coral)]"}`}>
          <p className={`text-sm ${msg.ok ? "text-[var(--teal-light)]" : "text-red-300"}`}>{msg.text}</p>
        </GlassCard>
      )}

      {q.isLoading ? (
        <GlassCard className="p-6"><p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading</p></GlassCard>
      ) : q.isError ? (
        <GlassCard className="p-6"><p className="text-sm text-red-300">Could not load your timing settings. Reload the page.</p></GlassCard>
      ) : (
        <>
          <GlassCard className="p-6 mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="max-w-md">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--teal)]" /> Always review before send
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  On: every note waits on the Schedule page until you approve it, and nothing
                  leaves your mailbox unread. Off: only the very first batch is held, and after
                  that Rapport sends each morning on its own.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!s?.alwaysReview}
                aria-label="Always review before send"
                disabled={save.isPending}
                onClick={() => save.mutate({ alwaysReview: !s?.alwaysReview })}
                className={`relative w-14 h-8 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                  s?.alwaysReview ? "bg-[var(--teal)]" : "bg-slate-700"
                }`}
              >
                <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${s?.alwaysReview ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-6 mb-5">
            <p className="text-sm font-semibold text-white">Renewal lead time</p>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              A renewal note goes out this many days before the renewal date. After it renews, the conversation is a claim, not a review.
            </p>
            <div className="flex flex-wrap gap-2">
              {LEAD_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => save.mutate({ renewalLeadDays: d })}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    s?.renewalLeadDays === d
                      ? "border-[var(--teal)] bg-[rgba(43,168,162,0.12)] text-[var(--teal-light)]"
                      : "border-[var(--surface-border)] text-[var(--text-muted)] hover:text-white"
                  }`}
                >{d === 0 ? "On the day" : `${d} days before`}</button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6 mb-5">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--teal)]" /> Tier cadence
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              The fewest days between notes to one person, by their tier. Set a contact&rsquo;s tier
              on their profile. Zero means no gap at all.
            </p>
            <div className="space-y-3">
              {TIERS.map((t: Tier) => (
                <div key={t} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{TIER_LABEL[t]}</p>
                    <p className="text-xs text-[var(--text-muted)]">{TIER_HINT[t]}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <GlassInput
                      aria-label={`Minimum days between notes for tier ${t}`}
                      type="number"
                      min={0}
                      max={365}
                      className="w-20"
                      value={tierDraft[t] ?? String(s?.tierDays?.[t] ?? "")}
                      onChange={(e) => setTierDraft({ ...tierDraft, [t]: e.target.value })}
                    />
                    <span className="text-xs text-[var(--text-muted)]">days</span>
                  </div>
                </div>
              ))}
            </div>
            <GlassButton
              size="sm"
              className="mt-4"
              loading={save.isPending}
              disabled={Object.keys(tierDraft).length === 0}
              onClick={() => {
                const out: Partial<Record<Tier, number>> = {}
                for (const t of TIERS) {
                  const v = tierDraft[t]
                  if (v === undefined) continue
                  const n = Number(v)
                  if (!Number.isInteger(n) || n < 0 || n > 365) { setMsg({ ok: false, text: "Days must be a whole number between 0 and 365." }); return }
                  out[t] = n
                }
                setMsg(null)
                setTierDraft({})
                save.mutate({ tierDays: out })
              }}
            >Save tier cadence</GlassButton>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="text-sm font-semibold text-white">Months since close</p>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Check-ins after a loan or home closing, in months. Up to eight, comma separated. Leave it at {s?.defaults.milestoneMonths.join(", ")} if you are not sure.
            </p>
            <div className="flex items-end gap-3">
              <GlassInput
                aria-label="Months since close"
                className="w-48"
                value={milestoneValue}
                onChange={(e) => setMilestoneDraft(e.target.value)}
                placeholder="3, 6, 12"
              />
              <GlassButton
                size="sm"
                loading={save.isPending}
                disabled={milestoneDraft === null}
                onClick={() => {
                  const months = (milestoneDraft ?? "")
                    .split(",")
                    .map((v) => Number(v.trim()))
                    .filter((v) => Number.isInteger(v) && v >= 1 && v <= 120)
                  if (months.length === 0) { setMsg({ ok: false, text: "Give at least one month between 1 and 120." }); return }
                  setMsg(null)
                  save.mutate({ milestoneMonths: months })
                }}
              >Save</GlassButton>
            </div>
          </GlassCard>

          <GlassCard className="p-6 mt-5">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--gold)]" /> Google review request
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              A short ask a set number of days after a closing, once per person, ever. It waits
              in the same queue as everything else, so you can skip anyone it would catch at a
              bad moment. Paste the link Google gives you under &ldquo;Ask for reviews&rdquo; on your
              Business Profile. No link, no review requests.
            </p>
            <div className="space-y-3">
              <GlassInput
                label="Review link"
                placeholder="https://g.page/r/..."
                value={reviewUrl ?? s?.googleReviewUrl ?? ""}
                onChange={(e) => setReviewUrl(e.target.value)}
              />
              <div>
                <label htmlFor="review-days" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Days after closing
                </label>
                <div className="flex items-end gap-3 mt-1.5">
                  <GlassInput
                    id="review-days"
                    type="number"
                    min={0}
                    max={365}
                    className="w-28"
                    value={reviewDays ?? String(s?.reviewRequestDays ?? 30)}
                    onChange={(e) => setReviewDays(e.target.value)}
                  />
                  <span className="text-xs text-[var(--text-muted)] pb-3">0 switches the automatic ask off</span>
                </div>
              </div>
              <GlassButton
                size="sm"
                loading={save.isPending}
                disabled={reviewUrl === null && reviewDays === null}
                onClick={() => {
                  const days = reviewDays === null ? undefined : Number(reviewDays)
                  if (days !== undefined && (!Number.isInteger(days) || days < 0 || days > 365)) {
                    setMsg({ ok: false, text: "Days must be a whole number between 0 and 365." })
                    return
                  }
                  setMsg(null)
                  save.mutate({
                    ...(reviewUrl !== null ? { googleReviewUrl: reviewUrl.trim() } : {}),
                    ...(days !== undefined ? { reviewRequestDays: days } : {}),
                  })
                }}
              >Save review settings</GlassButton>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
