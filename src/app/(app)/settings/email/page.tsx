"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import { CheckCircle, Mail, Send } from "lucide-react"

type Status = { connected: boolean; platformFallback: boolean; host: string | null; port: number | null; username: string | null; verified: boolean }

const PRESETS = [
  { id: "google", label: "Google Workspace / Gmail", host: "smtp.gmail.com", port: 587, hint: "Use an App Password (Google Account → Security → App passwords), not your login password." },
  { id: "microsoft", label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: 587, hint: "Your normal sign-in; SMTP AUTH must be on for the mailbox." },
  { id: "zoho", label: "Zoho Mail", host: "smtp.zoho.com", port: 465, hint: "Use an app-specific password." },
  { id: "other", label: "Other SMTP", host: "", port: 587, hint: "Any mailbox with SMTP works." },
]

export default function EmailSettingsPage() {
  const qc = useQueryClient()
  const status = useQuery<Status>({ queryKey: ["email-settings"], queryFn: () => fetch("/api/settings/email").then(r => r.json()) })
  const [preset, setPreset] = useState(PRESETS[0])
  const [host, setHost] = useState(PRESETS[0].host)
  const [port, setPort] = useState(String(PRESETS[0].port))
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const pick = (p: typeof PRESETS[number]) => { setPreset(p); setHost(p.host); setPort(String(p.port)) }

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

  const s = status.data

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-5 h-5 text-[var(--teal)]" />
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Email Provider</h1>
          <p className="text-sm text-[var(--text-muted)]">Rapport sends from your own mailbox, so every note arrives from you, not from a bulk sender.</p>
        </div>
      </div>

      <GlassCard className="p-6 mb-5">
        {status.isLoading ? <p className="text-sm text-[var(--text-muted)]">Checking…</p> : s?.connected ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--teal-light)] font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Connected</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">{s.username} via {s.host}:{s.port}</p>
            </div>
            <div className="flex gap-2">
              <GlassButton onClick={() => test.mutate()} loading={test.isPending}><Send className="w-4 h-4" /> Send test</GlassButton>
              <GlassButton onClick={() => disconnect.mutate()} loading={disconnect.isPending}>Disconnect</GlassButton>
            </div>
          </div>
        ) : s?.platformFallback ? (
          <p className="text-sm text-[var(--text-muted)]">No mailbox connected yet. Sends will use the Rapport shared mailbox until you connect yours below (recommended: deliverability is far better from your own address).</p>
        ) : (
          <p className="text-sm text-amber-300">No mailbox connected. Scheduled sends are on hold until you connect one below.</p>
        )}
      </GlassCard>

      <GlassCard className="p-6 space-y-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">Mailbox type</label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => pick(p)}
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

        {msg && <p className={`text-sm ${msg.ok ? "text-[var(--teal-light)]" : "text-red-300"}`}>{msg.text}</p>}

        <GlassButton onClick={() => { setMsg(null); save.mutate() }} loading={save.isPending} className="w-full">
          Verify and connect
        </GlassButton>
      </GlassCard>
    </div>
  )
}
