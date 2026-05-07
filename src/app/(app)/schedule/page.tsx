"use client"
import { useQuery } from "@tanstack/react-query"
import { GlassCard } from "@/components/ui/glass-card"
import { Calendar, Mail } from "lucide-react"
import { formatDate } from "@/lib/utils"

const OCCASION_COLORS: Record<string, string> = {
  birthday: "var(--teal)", anniversary: "var(--coral)", child_birthday: "var(--sky)",
  sports_win: "var(--gold)", sports_loss: "var(--text-muted)", get_well: "var(--gold)",
  appreciation: "var(--teal)", new_baby: "var(--sky)",
}

export default function SchedulePage() {
  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming-all"],
    queryFn: () => fetch("/api/schedule/upcoming").then(r => r.json()),
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-5 h-5 text-[var(--gold)]" />
        <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Send Schedule</h1>
        <span className="badge badge-gold ml-2">{upcoming.length} upcoming</span>
      </div>

      {upcoming.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center gap-3">
          <Calendar className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)]">No sends scheduled for the next 30 days</p>
          <p className="text-xs text-[var(--text-muted)]">Import contacts with birthdays or anniversaries to start scheduling</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {upcoming.map((send: any) => (
            <GlassCard key={send.id} className="p-4 flex items-center gap-4 hover:border-[var(--surface-border-hover)] transition-colors">
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
                  {send.status}
                </span>
                {send.emailSubject && (
                  <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]" title={send.emailSubject}>
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
