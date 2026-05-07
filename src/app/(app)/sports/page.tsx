"use client"
import { GlassCard } from "@/components/ui/glass-card"
import { Activity, Zap } from "lucide-react"

const LEAGUES = [
  { sport: "NFL", desc: "National Football League" },
  { sport: "NBA", desc: "National Basketball Association" },
  { sport: "MLB", desc: "Major League Baseball" },
  { sport: "NHL", desc: "National Hockey League" },
  { sport: "MLS", desc: "Major League Soccer" },
  { sport: "CFB", desc: "College Football" },
  { sport: "CBB", desc: "College Basketball (Men's)" },
]

export default function SportsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-[var(--coral)]" />
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Sports Monitor</h1>
          <p className="text-sm text-[var(--text-muted)]">Daily game results via ESPN — no API key required</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: "rgba(39,174,96,0.15)", color: "#4ade80", border: "1px solid rgba(39,174,96,0.25)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live Monitoring
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <GlassCard className="p-5 text-center">
          <p className="text-3xl font-bold text-white mb-1">7</p>
          <p className="text-xs text-[var(--text-muted)]">Leagues Monitored</p>
        </GlassCard>
        <GlassCard className="p-5 text-center">
          <p className="text-3xl font-bold text-white mb-1">3×</p>
          <p className="text-xs text-[var(--text-muted)]">Daily Score Checks</p>
        </GlassCard>
        <GlassCard className="p-5 text-center">
          <p className="text-3xl font-bold text-white mb-1">Wins</p>
          <p className="text-xs text-[var(--text-muted)]">Default: wins only</p>
        </GlassCard>
      </div>

      <GlassCard className="p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[var(--gold)]" />
          <h3 className="font-bold text-white text-sm">How Sports Monitoring Works</h3>
        </div>
        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
          <p>1. Rapport polls ESPN's public API 3× daily (8am, 2pm, 8pm PST)</p>
          <p>2. Completed games are matched against your contacts' favorite teams</p>
          <p>3. A personalized reaction email is queued for delivery next morning (8am)</p>
          <p>4. Rate limited to max 1 sports email per contact per 7 days</p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-3">
        {LEAGUES.map(({ sport, desc }) => (
          <GlassCard key={sport} className="p-4 flex items-center gap-3" accent="teal">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--teal-dark), var(--teal))" }}>
              {sport.slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{sport}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{desc}</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </GlassCard>
        ))}
      </div>

      <p className="text-[11px] text-[var(--text-muted)] mt-4 text-center">
        To add team preferences to a contact, open their profile in the Contacts table and use Paige to say "Add [team name] as [first name]'s favorite team"
      </p>
    </div>
  )
}
