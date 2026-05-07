"use client"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Mail, Users, TrendingUp, Heart, Calendar, CheckCircle, Clock, AlertTriangle, Activity } from "lucide-react"
import { formatDate } from "@/lib/utils"

const STAGGER = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }
const CONTAINER = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

function StatCard({ icon: Icon, label, value, sub, color = "teal" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    teal: "var(--teal)", coral: "var(--coral)", gold: "var(--gold)", sky: "var(--sky)"
  }
  return (
    <motion.div variants={STAGGER}>
      <GlassCard className="p-5 h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
            {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `rgba(${colors[color] === "var(--teal)" ? "43,168,162" : colors[color] === "var(--coral)" ? "239,108,74" : colors[color] === "var(--gold)" ? "255,210,63" : "93,173,226"},0.15)` }}>
            <Icon className="w-5 h-5" style={{ color: colors[color] }} />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/analytics/stats").then(r => r.json()),
  })

  const { data: todaySends = [] } = useQuery({
    queryKey: ["today-sends"],
    queryFn: () => fetch("/api/schedule/today").then(r => r.json()),
  })

  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming"],
    queryFn: () => fetch("/api/schedule/upcoming").then(r => r.json()),
  })

  const s = stats ?? {}

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {/* Stats grid */}
      <motion.div variants={CONTAINER} initial="hidden" animate="show" className="grid grid-cols-4 gap-4">
        <StatCard icon={Mail} label="Sent This Month" value={s.sentThisMonth ?? 0} sub="email cards delivered" color="teal" />
        <StatCard icon={TrendingUp} label="Open Rate" value={s.openRate ? `${s.openRate}%` : "—"} sub="vs 21% industry avg" color="gold" />
        <StatCard icon={Users} label="Contacts Enrolled" value={s.totalContacts ?? 0} sub="active in database" color="sky" />
        <StatCard icon={Activity} label="Sports Alerts" value={s.sportsAlerts ?? 0} sub="this month" color="coral" />
      </motion.div>

      <div className="grid grid-cols-3 gap-5">
        {/* Today's sends */}
        <div className="col-span-2">
          <GlassCard className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
              <h3 className="font-bold text-white">Going Out Today</h3>
              <span className="badge badge-teal ml-auto">{todaySends.length}</span>
            </div>
            {todaySends.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
                <CheckCircle className="w-8 h-8" />
                <p className="text-sm">Nothing scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySends.slice(0, 8).map((send: any) => (
                  <div key={send.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--teal-dark)] to-[var(--teal)] flex items-center justify-center text-[11px] font-bold text-white">
                      {send.contactFirstName?.[0]}{send.contactLastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{send.contactFirstName} {send.contactLastName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{send.occasionLabel}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${send.status === "sent" ? "bg-[var(--success)]" : send.status === "failed" ? "bg-[var(--error)]" : "bg-[var(--gold)]"}`} title={send.status} />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Upcoming */}
        <div>
          <GlassCard className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-[var(--gold)]" />
              <h3 className="font-bold text-white text-sm">Coming Up</h3>
            </div>
            <div className="space-y-2">
              {upcoming.slice(0, 10).map((item: any) => (
                <div key={item.id} className="flex items-start gap-2.5 py-2 border-b border-[var(--surface-border)] last:border-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-900/60 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold uppercase text-[var(--teal)]">
                      {new Date(item.scheduledDate).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-sm font-bold text-white leading-none">
                      {new Date(item.scheduledDate).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.contactFirstName} {item.contactLastName}</p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{item.occasionLabel}</p>
                  </div>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">Import contacts to see upcoming occasions</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
