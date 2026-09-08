"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassCard } from "@/components/ui/glass-card"
import {
  Calendar, Mail, Check, X, Pencil, Loader2, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { ScheduleItem } from "@/app/api/schedule/upcoming/route"
import type { ApproveResult } from "@/app/api/schedule/approve/route"

const OCCASION_COLORS: Record<string, string> = {
  birthday: "var(--teal)", anniversary: "var(--coral)", child_birthday: "var(--sky)",
  sports_win: "var(--gold)", sports_loss: "var(--text-muted)", get_well: "var(--gold)",
  appreciation: "var(--teal)", new_baby: "var(--sky)",
  policy_renewal: "var(--gold)", loan_anniversary: "var(--gold)", home_anniversary: "var(--gold)",
  months_since_close: "var(--sky)", custom_date: "var(--teal)", review_request: "var(--teal)",
}

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "waiting for you",
  approved: "sends next run",
  deferred: "held by today's cap",
  projected: "scheduled",
  sent: "sent",
  failed: "failed",
  skipped: "skipped",
  pending: "queued",
}

function name(item: ScheduleItem) {
  return [item.contactFirstName, item.contactLastName].filter(Boolean).join(" ") || "This contact"
}

function color(item: ScheduleItem) {
  return OCCASION_COLORS[item.occasionType] ?? "var(--teal)"
}

function DateChip({ date, tint }: { date: string; tint: string }) {
  const d = new Date(`${date}T00:00:00Z`)
  return (
    <div className="w-12 h-12 rounded-xl bg-slate-900/60 flex flex-col items-center justify-center shrink-0">
      <span className="text-[9px] font-bold uppercase" style={{ color: tint }}>
        {d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
      </span>
      <span className="text-xl font-bold text-white leading-none">{d.getUTCDate()}</span>
    </div>
  )
}

/** One held note, editable in place, with approve and skip under the thumb. */
function ReviewCard({ item, onDone }: { item: ScheduleItem; onDone: (r: ApproveResult) => void }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(item.emailSubject ?? "")
  const [body, setBody] = useState(item.emailBodyText ?? "")
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/schedule/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailSubject: subject, emailBodyText: body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not save the edit")
      return d
    },
    onSuccess: () => { setEditing(false); setError(null); qc.invalidateQueries({ queryKey: ["schedule"] }) },
    onError: (e: Error) => setError(e.message),
  })

  const decide = useMutation({
    mutationFn: async (action: "approve" | "skip") => {
      const r = await fetch("/api/schedule/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id], action }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not do that")
      return d as ApproveResult
    },
    onSuccess: (r) => { onDone(r); qc.invalidateQueries({ queryKey: ["schedule"] }) },
    onError: (e: Error) => setError(e.message),
  })

  const busy = decide.isPending || save.isPending

  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: color(item) }} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-semibold text-white">{name(item)}</p>
            <p className="text-xs text-[var(--text-muted)]">{item.occasionLabel}</p>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {item.contactEmail ?? "no address on file"} · {formatDate(item.scheduledDate)}
          </p>

          {editing ? (
            <div className="mt-3 space-y-2">
              <input
                aria-label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-premium text-sm w-full"
                placeholder="Subject"
              />
              <textarea
                aria-label="Message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="input-premium text-sm w-full resize-none"
                placeholder="The note"
              />
              <div className="flex gap-2">
                <GlassButton size="sm" loading={save.isPending} disabled={!subject.trim() || !body.trim()} onClick={() => save.mutate()}>
                  Save edit
                </GlassButton>
                <button
                  type="button"
                  className="text-sm text-[var(--text-muted)] underline"
                  onClick={() => { setSubject(item.emailSubject ?? ""); setBody(item.emailBodyText ?? ""); setEditing(false) }}
                >Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm font-medium text-white">{subject || <span className="italic text-[var(--text-muted)]">Not written yet</span>}</p>
              {body && <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap mt-1 leading-relaxed">{body}</p>}
            </div>
          )}

          {error && <p className="text-sm text-[var(--coral)] mt-2">{error}</p>}

          {!editing && (
            <div className="flex flex-wrap gap-2 mt-4">
              <GlassButton size="sm" loading={decide.isPending && decide.variables === "approve"} disabled={busy} onClick={() => decide.mutate("approve")}>
                <Check className="w-4 h-4" /> Approve and send
              </GlassButton>
              <GlassButton size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" /> Edit
              </GlassButton>
              <GlassButton size="sm" variant="ghost" loading={decide.isPending && decide.variables === "skip"} disabled={busy} onClick={() => decide.mutate("skip")}>
                <X className="w-4 h-4" /> Skip
              </GlassButton>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

export default function SchedulePage() {
  const qc = useQueryClient()
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [showUpcoming, setShowUpcoming] = useState(true)

  const { data: items = [], isLoading, isError } = useQuery<ScheduleItem[]>({
    queryKey: ["schedule"],
    queryFn: async () => {
      const r = await fetch("/api/schedule/upcoming")
      if (!r.ok) throw new Error("Could not load the schedule")
      return r.json()
    },
  })

  const today = new Date().toISOString().slice(0, 10)
  // Held for review, due today or overdue. Anything dated later stays in the list below.
  const held = items.filter((i) => (i.status === "pending_approval" || i.status === "deferred") && i.scheduledDate <= today)
  const heldIds = new Set(held.map((i) => i.id))
  const upcoming = items.filter((i) => !heldIds.has(i.id) || i.id === null)

  const report = (r: ApproveResult) => {
    if (r.action === "skip") { setFlash({ ok: true, text: `Skipped ${r.skipped}.` }); return }
    const parts: string[] = []
    if (r.sent) parts.push(`Sent ${r.sent}`)
    if (r.deferred) parts.push(`${r.deferred} held for the next run`)
    if (r.skipped) parts.push(`${r.skipped} skipped`)
    if (r.failed) parts.push(`${r.failed} failed`)
    setFlash({
      ok: r.failed === 0,
      text: `${parts.join(", ") || "Nothing to send"}.${r.message ? ` ${r.message}` : ""}`,
    })
  }

  const approveAll = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/schedule/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allToday: true, action: "approve" }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not approve")
      return d as ApproveResult
    },
    onSuccess: (r) => { report(r); qc.invalidateQueries({ queryKey: ["schedule"] }) },
    onError: (e: Error) => setFlash({ ok: false, text: e.message }),
  })

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-1">
        <Calendar className="w-5 h-5 text-[var(--gold)]" />
        <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Today&rsquo;s notes</h1>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        Read them, change anything that is not how you would put it, then approve. Two minutes.
      </p>

      {flash && (
        <GlassCard className={`p-4 mb-4 flex items-start gap-2 ${flash.ok ? "border-[var(--teal)]" : "border-[var(--coral)]"}`}>
          {flash.ok ? <CheckCircle2 className="w-4 h-4 text-[var(--teal-light)] shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />}
          <p className={`text-sm ${flash.ok ? "text-[var(--teal-light)]" : "text-red-300"}`}>{flash.text}</p>
        </GlassCard>
      )}

      {isLoading && (
        <GlassCard className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">Loading your schedule</p>
        </GlassCard>
      )}

      {isError && (
        <GlassCard className="p-6 border-[var(--coral)]">
          <p className="text-sm text-red-300">Could not load the schedule. Reload the page.</p>
        </GlassCard>
      )}

      {!isLoading && !isError && (
        <>
          {held.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap sticky top-0 z-10 py-2 -mx-1 px-1 bg-[var(--bg,#09111F)]/90 backdrop-blur">
                <p className="text-sm text-white font-semibold">
                  {held.length} {held.length === 1 ? "note is" : "notes are"} waiting for you
                </p>
                <GlassButton size="sm" loading={approveAll.isPending} onClick={() => { setFlash(null); approveAll.mutate() }}>
                  <Check className="w-4 h-4" /> Approve all today
                </GlassButton>
              </div>
              <div className="space-y-3">
                {held.map((item) => <ReviewCard key={item.id} item={item} onDone={report} />)}
              </div>
            </>
          ) : (
            <GlassCard className="p-8 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="w-10 h-10 text-[var(--teal)]" />
              <p className="text-white font-semibold">Nothing waiting on you</p>
              <p className="text-sm text-[var(--text-muted)] max-w-sm">
                When a note is due it appears here for a read before it goes out. What is coming is below.
              </p>
            </GlassCard>
          )}

          <div className="mt-8">
            <button type="button" onClick={() => setShowUpcoming(v => !v)} className="flex items-center gap-2 mb-3">
              {showUpcoming ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
              <span className="text-sm font-semibold text-white">Next 30 days</span>
              <span className="badge badge-gold">{upcoming.length}</span>
            </button>

            {showUpcoming && (
              upcoming.length === 0 ? (
                <GlassCard className="p-8 flex flex-col items-center gap-2 text-center">
                  <Calendar className="w-8 h-8 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">Nothing scheduled in the next 30 days.</p>
                  <p className="text-xs text-[var(--text-muted)]">Add a renewal or closing date to a contact and it will show up here.</p>
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((item) => (
                    <GlassCard
                      key={item.id ?? `${item.contactId}-${item.occasionType}-${item.scheduledDate}`}
                      className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
                    >
                      <DateChip date={item.scheduledDate} tint={color(item)} />
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: color(item) }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{name(item)}</p>
                        <p className="text-sm text-[var(--text-muted)] truncate">{item.occasionLabel}</p>
                        {item.emailSubject && (
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                            <Mail className="w-3 h-3 inline mr-1" />{item.emailSubject}
                          </p>
                        )}
                      </div>
                      <span className={`badge shrink-0 ${item.status === "sent" ? "badge-green" : item.status === "failed" ? "badge-coral" : "badge-gold"}`}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </GlassCard>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}
