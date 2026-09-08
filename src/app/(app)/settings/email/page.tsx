"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import {
  CheckCircle, Mail, Send, ShieldCheck, ShieldAlert, ShieldX, Gauge, RefreshCw,
  ChevronDown, ChevronRight, Loader2, AlertTriangle,
} from "lucide-react"
import type { EmailSettings } from "@/app/api/settings/email/route"
import type { DnsReport, RecordCheck } from "@/lib/dns-check"

const SMTP_PRESETS = [
  { id: "zoho", label: "Zoho Mail", host: "smtp.zoho.com", port: 465, hint: "Use an app-specific password." },
  { id: "google", label: "Gmail (app password)", host: "smtp.gmail.com", port: 587, hint: "Only if OAuth is not an option: Google Account, Security, App passwords." },
  { id: "microsoft", label: "Microsoft 365 (basic auth)", host: "smtp.office365.com", port: 587, hint: "SMTP AUTH must be switched on for the mailbox." },
  { id: "other", label: "Other SMTP", host: "", port: 587, hint: "Any mailbox with an SMTP server works." },
]

const KIND_LABEL: Record<string, string> = {
  google: "Google Workspace / Gmail", microsoft: "Microsoft 365 / Outlook", smtp: "SMTP", none: "Not connected",
}

function statusIcon(s: RecordCheck["status"]) {
  if (s === "pass") return <ShieldCheck className="w-4 h-4 text-[var(--teal-light)] shrink-0 mt-0.5" />
  if (s === "warn") return <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
  return <ShieldX className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
}

function DnsRow({ name, check }: { name: string; check: RecordCheck }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-[var(--surface-border)] last:border-0">
      {statusIcon(check.status)}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{check.detail}</p>
        {check.found && <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1 break-all opacity-70">{check.found}</p>}
      </div>
    </div>
  )
}

export default function EmailSettingsPage() {
  const qc = useQueryClient()
  const params = useSearchParams()
  const status = useQuery<EmailSettings>({ queryKey: ["email-settings"], queryFn: () => fetch("/api/settings/email").then(r => r.json()) })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showSmtp, setShowSmtp] = useState(false)
  const [preset, setPreset] = useState(SMTP_PRESETS[0])
  const [host, setHost] = useState(SMTP_PRESETS[0].host)
  const [port, setPort] = useState(String(SMTP_PRESETS[0].port))
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [capDraft, setCapDraft] = useState<string | null>(null)

  // The OAuth callback comes back here with the outcome in the query string. It is read
  // during render, not written into state, and the query string is tidied away after.
  const flashConnected = params.get("connected")
  const flashError = params.get("error")
  const banner = msg
    ?? (flashConnected ? { ok: true, text: `Connected. Notes will send from ${flashConnected}.` } : null)
    ?? (flashError ? { ok: false, text: flashError } : null)

  useEffect(() => {
    if (flashConnected || flashError) window.history.replaceState({}, "", "/settings/email")
  }, [flashConnected, flashError])

  const pick = (p: typeof SMTP_PRESETS[number]) => { setPreset(p); setHost(p.host); setPort(String(p.port)) }

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/settings/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host, port: Number(port), username, password }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not save")
      return d
    },
    onSuccess: () => { setMsg({ ok: true, text: "Mailbox connected. Sends will go out from it." }); setPassword(""); qc.invalidateQueries({ queryKey: ["email-settings"] }) },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  const test = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/settings/email/test", { method: "POST" })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Send failed")
      return d as { to: string }
    },
    onSuccess: (d) => setMsg({ ok: true, text: `Test sent to ${d.to}. Check your inbox.` }),
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  const disconnect = useMutation({
    mutationFn: () => fetch("/api/settings/email", { method: "DELETE" }),
    onSuccess: () => { setMsg({ ok: true, text: "Mailbox disconnected." }); qc.invalidateQueries({ queryKey: ["email-settings"] }) },
  })

  const patch = useMutation({
    mutationFn: async (body: { dailyCap?: number; bodyStyle?: "plain" | "card" }) => {
      const r = await fetch("/api/settings/email", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not save")
      return d
    },
    onSuccess: () => { setCapDraft(null); qc.invalidateQueries({ queryKey: ["email-settings"] }) },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  const dns = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/settings/email/dns", { method: "POST" })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "The check did not run")
      return d as DnsReport
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-settings"] }),
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  const s = status.data
  const caps = s?.caps

  return (
    <div className="p-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-5 h-5 text-[var(--teal)]" />
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Sending mailbox</h1>
          <p className="text-sm text-[var(--text-muted)]">Every note leaves from your own address, so it lands in the inbox and reads like you wrote it.</p>
        </div>
      </div>

      {banner && (
        <GlassCard className={`p-4 mb-4 ${banner.ok ? "border-[var(--teal)]" : "border-[var(--coral)]"}`}>
          <p className={`text-sm ${banner.ok ? "text-[var(--teal-light)]" : "text-red-300"}`}>{banner.text}</p>
        </GlassCard>
      )}

      {/* Connection */}
      <GlassCard className="p-6 mb-5">
        {status.isLoading ? (
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking your mailbox</p>
        ) : status.isError ? (
          <p className="text-sm text-red-300">Could not read your mailbox settings. Reload the page.</p>
        ) : s?.connected ? (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-[var(--teal-light)] font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Connected</p>
              <p className="text-sm text-white mt-1">{s.address ?? s.username}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {KIND_LABEL[s.kind]}{s.kind === "smtp" && s.host ? ` via ${s.host}:${s.port}` : ""}
                {s.connectedAt ? ` · connected ${new Date(s.connectedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <GlassButton size="sm" onClick={() => { setMsg(null); test.mutate() }} loading={test.isPending}><Send className="w-4 h-4" /> Send test</GlassButton>
              <GlassButton size="sm" variant="ghost" onClick={() => disconnect.mutate()} loading={disconnect.isPending}>Disconnect</GlassButton>
            </div>
          </div>
        ) : s?.platformFallback ? (
          <p className="text-sm text-[var(--text-muted)]">No mailbox connected yet. Sends use the shared Rapport mailbox until you connect yours, and deliverability is far better from your own address.</p>
        ) : (
          <p className="text-sm text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            No mailbox connected. Scheduled notes stay on hold until you connect one.
          </p>
        )}
      </GlassCard>

      {/* One-click providers */}
      <GlassCard className="p-6 mb-5">
        <p className="text-sm font-semibold text-white mb-1">Connect in one click</p>
        <p className="text-sm text-[var(--text-muted)] mb-4">Rapport asks for permission to send only. It cannot read your mail, and you can revoke it from your account at any time.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {(s?.providers ?? [{ id: "google", label: "Google Workspace / Gmail", available: false }, { id: "microsoft", label: "Microsoft 365 / Outlook", available: false }]).map((p) => (
            <div key={p.id}>
              <a
                href={p.available ? `/api/oauth/${p.id}/start` : undefined}
                aria-disabled={!p.available}
                className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                  p.available
                    ? "border-[var(--teal)] text-white hover:bg-[rgba(43,168,162,0.12)]"
                    : "border-[var(--surface-border)] text-[var(--text-muted)] cursor-not-allowed opacity-60"
                }`}
                onClick={(e) => { if (!p.available) e.preventDefault() }}
              >
                <Mail className="w-4 h-4" /> {p.label}
              </a>
              {!p.available && <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Not enabled on this deployment. Use SMTP below.</p>}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Deliverability */}
      <GlassCard className="p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-4 h-4 text-[var(--gold)]" />
          <p className="text-sm font-semibold text-white">Deliverability</p>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          A mailbox that suddenly sends two hundred notes in a morning gets filtered. Rapport paces itself.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Sent today</p>
            <p className="text-2xl font-bold text-white">{caps?.sentToday ?? 0}</p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Today&apos;s ceiling</p>
            <p className="text-2xl font-bold text-white">{caps?.effectiveCap ?? "-"}</p>
            {caps?.warmupCap != null && <p className="text-[11px] text-[var(--gold)] mt-0.5">warm-up day {caps.warmupDay}</p>}
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Left today</p>
            <p className="text-2xl font-bold text-white">{caps?.remaining ?? 0}</p>
          </div>
        </div>

        <label htmlFor="daily-cap" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Daily cap</label>
        <div className="flex items-end gap-3 mt-1.5">
          <GlassInput
            id="daily-cap"
            type="number"
            min={caps?.min ?? 1}
            max={caps?.max ?? 500}
            className="w-32"
            value={capDraft ?? String(caps?.dailyCap ?? 40)}
            onChange={(e) => setCapDraft(e.target.value)}
          />
          <GlassButton
            size="sm"
            disabled={capDraft === null || capDraft === String(caps?.dailyCap ?? 40)}
            loading={patch.isPending}
            onClick={() => patch.mutate({ dailyCap: Number(capDraft) })}
          >Save</GlassButton>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          Anything past the ceiling is written and parked, never dropped; it goes out on the next morning run.
          Warm-up ramp for a new mailbox: {(caps?.ramp ?? []).map((r) => `${r.cap}/day through day ${r.throughDay}`).join(", ")}, then your cap.
        </p>

        <div className="mt-5 pt-5 border-t border-[var(--surface-border)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">How the note looks</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {([
              ["plain", "Plain text", "What a real person sends. Best deliverability, best reply rate."],
              ["card", "Card image", "The branded card layout with your image above the note."],
            ] as const).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                onClick={() => patch.mutate({ bodyStyle: id })}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  (s?.bodyStyle ?? "plain") === id
                    ? "border-[var(--teal)] bg-[rgba(43,168,162,0.1)]"
                    : "border-[var(--surface-border)] hover:border-[var(--surface-border-hover)]"
                }`}
              >
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* SPF / DKIM / DMARC */}
      <GlassCard className="p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-white">Domain authentication</p>
            <p className="text-sm text-[var(--text-muted)]">
              {s?.dns ? `Last checked ${new Date(s.dns.checkedAt).toLocaleString()} for ${s.dns.domain}.` : "Check SPF, DKIM and DMARC on the domain your notes send from."}
            </p>
          </div>
          <GlassButton size="sm" onClick={() => { setMsg(null); dns.mutate() }} loading={dns.isPending} disabled={!s?.connected && !s?.platformFallback}>
            <RefreshCw className="w-4 h-4" /> {s?.dns ? "Check again" : "Run the check"}
          </GlassButton>
        </div>

        {dns.isPending && <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Reading the DNS records</p>}

        {!dns.isPending && !s?.dns && (
          <p className="text-sm text-[var(--text-muted)]">Not checked yet. This reads public DNS only and changes nothing.</p>
        )}

        {!dns.isPending && s?.dns && (
          <div>
            {s.dns.stale && <p className="text-xs text-amber-300 mb-2">This result is more than a week old. Run it again.</p>}
            <DnsRow name="SPF" check={s.dns.spf} />
            <DnsRow name="DKIM" check={s.dns.dkim} />
            <DnsRow name="DMARC" check={s.dns.dmarc} />
          </div>
        )}
      </GlassCard>

      {/* SMTP fallback */}
      <GlassCard className="p-6">
        <button type="button" className="flex items-center gap-2 w-full text-left" onClick={() => setShowSmtp(v => !v)}>
          {showSmtp ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
          <span className="text-sm font-semibold text-white">Connect an SMTP mailbox instead</span>
        </button>
        {showSmtp && (
          <div className="space-y-5 mt-5">
            <p className="text-sm text-[var(--text-muted)]">For mailboxes Google and Microsoft sign-in does not cover. Your password is encrypted before it is stored and is never shown again.</p>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">Mailbox type</span>
              <div className="grid grid-cols-2 gap-2">
                {SMTP_PRESETS.map(p => (
                  <button key={p.id} type="button" onClick={() => pick(p)}
                    className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${preset.id === p.id ? "border-[var(--teal)] bg-[rgba(43,168,162,0.1)] text-[var(--teal-light)]" : "border-[var(--surface-border)] text-[var(--text-muted)] hover:text-white"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">{preset.hint}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><GlassInput label="SMTP host" value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.example.com" /></div>
              <GlassInput label="Port" value={port} onChange={e => setPort(e.target.value)} placeholder="587" />
            </div>
            <GlassInput label="Email address (username)" value={username} onChange={e => setUsername(e.target.value)} placeholder="you@yourcompany.com" />
            <GlassInput label="Password / app password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

            <GlassButton onClick={() => { setMsg(null); save.mutate() }} loading={save.isPending} className="w-full">
              Verify and connect
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
