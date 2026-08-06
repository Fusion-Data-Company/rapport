"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import {
  Mail, Users, TrendingUp, Activity,
  CheckCircle, Calendar, Plus, Sprout
} from "lucide-react"

interface ScheduledSend {
  id: string
  contactFirstName?: string
  contactLastName?: string
  occasionLabel: string
  status: string
}

interface UpcomingItem {
  id: string
  contactFirstName?: string
  contactLastName?: string
  occasionLabel: string
  scheduledDate: string
}

const STAGGER = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }
const CONTAINER = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const ACCENT: Record<string, string> = {
  teal:  "var(--teal)",
  gold:  "var(--gold)",
  sky:   "var(--sky)",
  coral: "var(--coral)",
}

const ACCENT_RGB: Record<string, string> = {
  teal:  "43,168,162",
  gold:  "255,210,63",
  sky:   "93,173,226",
  coral: "239,108,74",
}

function StatCard({
  icon: Icon, label, value, sub, color = "teal",
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const accent = ACCENT[color] ?? "var(--teal)"
  const rgb = ACCENT_RGB[color] ?? "43,168,162"
  return (
    <motion.div variants={STAGGER} className="min-w-0">
      <GlassCard
        className="p-5 h-full overflow-hidden"
        style={{ borderTop: `3px solid ${accent}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-muted)]">
              {label}
            </p>
            <p className="text-2xl font-bold text-white tabular-nums truncate">{value}</p>
            {sub && (
              <p className="text-xs mt-1 text-[var(--text-muted)] truncate">{sub}</p>
            )}
          </div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `rgba(${rgb},0.15)` }}
          >
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

export default function DashboardPage() {
  const qc = useQueryClient()

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

  const seedMutation = useMutation({
    mutationFn: () => fetch("/api/dev/seed", { method: "POST" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries(),
  })

  const s = stats ?? {}
  const isDev = process.env.NODE_ENV !== "production"

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-full">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDev && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => seedMutation.mutate()}
              loading={seedMutation.isPending}
              title="Insert a fully-populated test contact (dev only)"
            >
              <Sprout className="w-3.5 h-3.5" />
              Load test data
            </GlassButton>
          )}
          <Link href="/contacts">
            <GlassButton size="sm">
              <Plus className="w-3.5 h-3.5" />
              Add Contact
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <motion.div
        variants={CONTAINER}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Mail}
          label="Sent This Month"
          value={s.sentThisMonth ?? 0}
          sub="email cards delivered"
          color="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="Open Rate"
          value={s.openRate ? `${s.openRate}%` : "—"}
          sub="vs 21% industry avg"
          color="gold"
        />
        <StatCard
          icon={Users}
          label="Contacts"
          value={s.totalContacts ?? 0}
          sub="active in database"
          color="sky"
        />
        <StatCard
          icon={Activity}
          label="Sports Alerts"
          value={s.sportsAlerts ?? 0}
          sub="this month"
          color="coral"
        />
      </motion.div>

      {/* Content row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Going Out Today — 2/3 */}
        <GlassCard className="col-span-2 p-5 min-h-[280px]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
            <h3 className="font-bold text-white">Going Out Today</h3>
            <span className="badge badge-teal ml-auto">{todaySends.length}</span>
          </div>

          {todaySends.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-[var(--text-muted)]">
              <CheckCircle className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">All clear for today</p>
              <Link href="/schedule">
                <GlassButton variant="ghost" size="sm">View Schedule →</GlassButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySends.slice(0, 8).map((send: ScheduledSend) => (
                <div
                  key={send.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--teal-dark)] to-[var(--teal)] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {send.contactFirstName?.[0]}{send.contactLastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {send.contactFirstName} {send.contactLastName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{send.occasionLabel}</p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      send.status === "sent"   ? "bg-[var(--success)]" :
                      send.status === "failed" ? "bg-[var(--error)]"   :
                      "bg-[var(--gold)]"
                    }`}
                    title={send.status}
                  />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Coming Up — 1/3 */}
        <GlassCard className="p-5 min-h-[280px]">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[var(--gold)]" />
            <h3 className="font-bold text-white text-sm">Coming Up</h3>
            {upcoming.length > 0 && (
              <span className="badge badge-gold ml-auto">{upcoming.length}</span>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-[var(--text-muted)]">
              <Calendar className="w-7 h-7 opacity-30" />
              <p className="text-xs text-center leading-relaxed">No upcoming occasions yet</p>
              <Link href="/contacts/import">
                <GlassButton variant="ghost" size="sm">Import Contacts →</GlassButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {upcoming.slice(0, 10).map((item: UpcomingItem) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 border-b border-[var(--surface-border)] last:border-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-900/60 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold uppercase text-[var(--teal)]">
                      {new Date(item.scheduledDate).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-sm font-bold text-white leading-none">
                      {new Date(item.scheduledDate).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {item.contactFirstName} {item.contactLastName}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{item.occasionLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
