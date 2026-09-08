"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassCard } from "@/components/ui/glass-card"
import { Calendar, Mail } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { ScheduleItem } from "@/app/api/schedule/upcoming/route"

const OCCASION_COLORS: Record<string, string> = {
  birthday: "var(--teal)", anniversary: "var(--coral)", child_birthday: "var(--sky)",
  sports_win: "var(--gold)", sports_loss: "var(--text-muted)", get_well: "var(--gold)",
  appreciation: "var(--teal)", new_baby: "var(--sky)",
  policy_renewal: "var(--gold)", loan_anniversary: "var(--gold)", home_anniversary: "var(--gold)",
  months_since_close: "var(--sky)", custom_date: "var(--teal)", review_request: "var(--teal)",
}

export default function SchedulePage() {
  const qc = useQueryClient()
  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming-all"],
    queryFn: () => fetch("/api/schedule/upcoming").then(r => r.json()),
  })
  const held = (upcoming as Array<{ status: string }>).filter((s) => s.status === "pending_approval")
  const decide = useMutation({
    mutationFn: (action: "approve" | "skip") => fetch("/api/schedule/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true, action }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["upcoming-all"] }),
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-5 h-5 text-[var(--gold)]" />
        <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Send Schedule</h1>
        <span className="badge badge-gold ml-2">{upcoming.length} upcoming</span>
      </div>

      {held.length > 0 && (
        <GlassCard className="p-5 mb-4 border-[var(--gold)]">
          <p className="font-semibold text-white">Your first {held.length === 1 ? "note is" : `${held.length} notes are`} written and waiting for you.</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Rapport holds a new account&rsquo;s first day of sends until you have read them. Open each one below, then release the batch. Nothing goes out until you do.</p>
          <div className="flex gap-3 mt-3">
            <GlassButton onClick={() => decide.mutate("approve")} disabled={decide.isPending}>Send them on the next run</GlassButton>
            <button type="button" className="text-sm text-[var(--text-muted)] underline" onClick={() => decide.mutate("skip")} disabled={decide.isPending}>Skip this batch</button>
          </div>
        </GlassCard>
      )}

      {upcoming.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center gap-3">
          <Calendar className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)]">No sends scheduled for the next 30 days</p>
          <p className="text-xs text-[var(--text-muted)]">Import contacts with birthdays or anniversaries to start scheduling</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {upcoming.map((send: ScheduleItem) => (
            <GlassCard key={send.id ?? `${send.contactId}-${send.occasionType}-${send.scheduledDate}`} className="p-4 flex items-center gap-4 hover:border-[var(--surface-border-hover)] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-slate-900/60 flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-bold uppercase" style={{ color: OCCASION_COLORS[send.occasionType] ?? "var(--teal)" }}>
                  {new Date(send.scheduledDate).toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-xl font-bold text-white leading-none">
                  {new Date(send.scheduledDate).getDate()}
                </span>
              </div>
              <div className="w-1 h-8 rounded-full shrink-0" style={{ background: OCCASION_COLORS[send.occasionType] ?? "var(--teal)" }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{send.contactFirstName} {send.contactLastName}</p>
                <p className="text-sm text-[var(--text-muted)]">{send.occasionLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${send.status === "sent" ? "badge-green" : send.status === "failed" ? "badge-coral" : "badge-gold"}`}>
                  {send.status === "pending_approval" ? "waiting for you"
                    : send.status === "approved" ? "sends next run"
                    : send.status === "projected" ? "scheduled"
                    : send.status === "deferred" ? "held by cap"
                    : send.status}
                </span>
                {send.emailSubject && (
                  <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]" title={send.emailBodyText ? `${send.emailSubject}\n\n${send.emailBodyText}` : send.emailSubject}>
                    <Mail className="w-3 h-3 inline mr-1" />{send.emailSubject}
                  </span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
