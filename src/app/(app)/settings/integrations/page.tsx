"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import {
  Webhook, Plug, Copy, Check, RefreshCw, Trash2, Play, Pause, Loader2, AlertTriangle, KeyRound,
} from "lucide-react"
import type { EndpointView } from "@/app/api/webhooks/endpoints/route"
import type { InboundSettings } from "@/app/api/settings/inbound/route"

const EVENTS = [
  { id: "note.sent", label: "A note went out" },
  { id: "note.held", label: "A note is waiting for approval" },
  { id: "note.failed", label: "A note could not be sent" },
  { id: "note.skipped", label: "A note was skipped" },
]

const INBOUND_FIELDS = [
  ["first_name, last_name", "or a single name field"],
  ["email", "the address notes go to"],
  ["external_id", "your system's id, so a re-send updates rather than duplicates"],
  ["tier", "A, B or C"],
  ["birthdate, anniversary", "2026-03-15, 3/15/2026 or March 15, 2026"],
  ["policy_renewal_date, policy_type", "the renewal that pays for this"],
  ["loan_closed_date, loan_type", "closing anniversaries and months-since-close"],
  ["home_purchase_date", "home anniversary"],
  ["custom_date, custom_date_label", "anything else worth remembering"],
  ["company, title, phone, city, state, zip", "the rest of the record"],
]

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
      <div className="flex gap-2">
        <code className="flex-1 min-w-0 text-xs font-mono bg-slate-900/70 border border-[var(--surface-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] break-all">
          {value}
        </code>
        <GlassButton
          size="sm"
          variant="ghost"
          onClick={async () => {
            try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked; the text is selectable */ }
          }}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </GlassButton>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const qc = useQueryClient()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [events, setEvents] = useState<string[]>([])
  const [freshSecret, setFreshSecret] = useState<string | null>(null)

  const endpoints = useQuery<EndpointView[]>({
    queryKey: ["webhook-endpoints"],
    queryFn: async () => {
      const r = await fetch("/api/webhooks/endpoints")
      if (!r.ok) throw new Error("Could not load your endpoints")
      return r.json()
    },
  })

  const inbound = useQuery<InboundSettings>({
    queryKey: ["inbound-url"],
    queryFn: async () => {
      const r = await fetch("/api/settings/inbound")
      if (!r.ok) throw new Error("Could not load the inbound URL")
      return r.json()
    },
  })

  const add = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/webhooks/endpoints", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, description: description || null, events: events.length ? events : undefined }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not add that endpoint")
      return d as EndpointView & { secret: string }
    },
    onSuccess: (d) => {
      setUrl(""); setDescription(""); setEvents([])
      setFreshSecret(d.secret)
      setMsg({ ok: true, text: "Endpoint added. Copy the signing secret now; it is not shown again." })
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] })
    },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  const toggle = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const r = await fetch(`/api/webhooks/endpoints/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }),
      })
      if (!r.ok) throw new Error("Could not change that endpoint")
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => fetch(`/api/webhooks/endpoints/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  })

  const test = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/webhooks/endpoints/${id}/test`, { method: "POST" })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "The test did not run")
      return d as { status: number | null; error: string | null }
    },
    onSuccess: (d) => {
      setMsg(d.error
        ? { ok: false, text: `The endpoint answered ${d.status ?? "nothing"}: ${d.error}` }
        : { ok: true, text: `Sample payload delivered, ${d.status} back.` })
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] })
    },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  const roll = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/settings/inbound", { method: "POST" })
      if (!r.ok) throw new Error("Could not make a new URL")
      return r.json() as Promise<InboundSettings>
    },
    onSuccess: () => { setMsg({ ok: true, text: "New inbound URL. The old one stopped working just now." }); qc.invalidateQueries({ queryKey: ["inbound-url"] }) },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  })

  return (
    <div className="p-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Plug className="w-5 h-5 text-[var(--teal)]" />
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Integrations</h1>
          <p className="text-sm text-[var(--text-muted)]">Events out, contacts in. Both work with Zapier as they are.</p>
        </div>
      </div>

      {msg && (
        <GlassCard className={`p-4 mb-4 ${msg.ok ? "border-[var(--teal)]" : "border-[var(--coral)]"}`}>
          <p className={`text-sm ${msg.ok ? "text-[var(--teal-light)]" : "text-red-300"}`}>{msg.text}</p>
        </GlassCard>
      )}

      {freshSecret && (
        <GlassCard className="p-5 mb-5 border-[var(--gold)]">
          <p className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-[var(--gold)]" /> Signing secret
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Copy this now. It is not stored anywhere you can read it again. Verify a delivery by
            computing HMAC-SHA256 of <code className="font-mono">&lt;timestamp&gt;.&lt;raw body&gt;</code> with this
            secret and comparing it to the v1 value in the <code className="font-mono">X-Rapport-Signature</code> header.
          </p>
          <CopyField label="Secret" value={freshSecret} />
          <button type="button" className="text-xs text-[var(--text-muted)] underline mt-3" onClick={() => setFreshSecret(null)}>
            I have copied it
          </button>
        </GlassCard>
      )}

      {/* Outbound */}
      <GlassCard className="p-6 mb-5">
        <p className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
          <Webhook className="w-4 h-4 text-[var(--teal)]" /> Send events out
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Every note that goes out, is held, fails or is skipped can post to a URL. The body is
          flat JSON, so a Zapier Catch Hook maps it without a code step.
        </p>

        <div className="space-y-3">
          <GlassInput label="URL" placeholder="https://hooks.zapier.com/hooks/catch/..." value={url} onChange={(e) => setUrl(e.target.value)} />
          <GlassInput label="What is it for" placeholder="Zapier: log to the agency sheet" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Events</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {EVENTS.map((e) => {
                const on = events.includes(e.id)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEvents(on ? events.filter((v) => v !== e.id) : [...events, e.id])}
                    className={`p-2.5 rounded-xl border text-left text-sm transition-colors ${
                      on ? "border-[var(--teal)] bg-[rgba(43,168,162,0.1)] text-[var(--teal-light)]" : "border-[var(--surface-border)] text-[var(--text-muted)] hover:text-white"
                    }`}
                  >{e.label}</button>
                )
              })}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Pick none and the endpoint receives all four.</p>
          </div>
          <GlassButton loading={add.isPending} disabled={!url.trim()} onClick={() => { setMsg(null); add.mutate() }}>
            Add endpoint
          </GlassButton>
        </div>

        <div className="mt-6 pt-5 border-t border-[var(--surface-border)] space-y-3">
          {endpoints.isLoading && <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading endpoints</p>}
          {endpoints.isError && <p className="text-sm text-red-300">Could not load your endpoints. Reload the page.</p>}
          {endpoints.data?.length === 0 && <p className="text-sm text-[var(--text-muted)] italic">No endpoints yet.</p>}
          {endpoints.data?.map((ep) => (
            <div key={ep.id} className="rounded-xl border border-[var(--surface-border)] p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm text-white break-all">{ep.url}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {ep.description ? `${ep.description} · ` : ""}
                    {ep.events?.length ? ep.events.join(", ") : "all events"}
                    {ep.isActive ? "" : " · paused"}
                  </p>
                  {ep.lastAttemptAt && (
                    <p className={`text-[11px] mt-1 ${ep.lastError ? "text-[var(--coral)]" : "text-[var(--teal-light)]"}`}>
                      last {ep.lastError ? "failed" : "ok"} at {new Date(ep.lastAttemptAt).toLocaleString()}
                      {ep.lastError ? `: ${ep.lastError}` : ` (${ep.lastStatus})`}
                    </p>
                  )}
                  {ep.consecutiveFailures >= 20 && (
                    <p className="text-[11px] text-[var(--coral)] flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Stopped after 20 failures in a row. Resume to try again.
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <GlassButton size="sm" variant="ghost" loading={test.isPending && test.variables === ep.id} onClick={() => { setMsg(null); test.mutate(ep.id) }}>
                    Send sample
                  </GlassButton>
                  <GlassButton size="sm" variant="ghost" onClick={() => toggle.mutate({ id: ep.id, isActive: !ep.isActive })}>
                    {ep.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </GlassButton>
                  <GlassButton size="sm" variant="ghost" onClick={() => remove.mutate(ep.id)}>
                    <Trash2 className="w-4 h-4" />
                  </GlassButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Inbound */}
      <GlassCard className="p-6">
        <p className="text-sm font-semibold text-white mb-1">Contacts in</p>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Post contacts here from HawkSoft, EZLynx, Follow Up Boss, Zapier, or anything that can
          call a URL. Send one object or an array. A record with the same external_id or email
          updates the contact instead of making a second copy, and a field you leave out is left
          alone rather than blanked. The same column names work in the CSV importer.
        </p>

        {inbound.isLoading && <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading</p>}
        {inbound.isError && <p className="text-sm text-red-300">Could not load the inbound URL. Reload the page.</p>}
        {inbound.data && (
          <>
            <CopyField label="Your inbound URL" value={inbound.data.url} />
            <GlassButton size="sm" variant="ghost" className="mt-3" loading={roll.isPending} onClick={() => { setMsg(null); roll.mutate() }}>
              <RefreshCw className="w-4 h-4" /> New URL
            </GlassButton>
          </>
        )}

        <div className="mt-5 pt-5 border-t border-[var(--surface-border)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Fields it reads</p>
          <dl className="space-y-1.5">
            {INBOUND_FIELDS.map(([field, note]) => (
              <div key={field} className="flex flex-wrap gap-x-2 text-sm">
                <dt className="font-mono text-[13px] text-[var(--teal-light)]">{field}</dt>
                <dd className="text-[var(--text-muted)]">{note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </GlassCard>
    </div>
  )
}
