"use client"
import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import { CheckCircle, Brain } from "lucide-react"

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter (recommended)", models: ["google/gemma-4-26b-a4b-it", "google/gemma-4-31b-it", "anthropic/claude-sonnet-4-6", "meta-llama/llama-3.3-70b-instruct", "openai/gpt-4o-mini"] },
  { id: "anthropic",  label: "Anthropic (Claude)",       models: ["claude-sonnet-4-6", "claude-haiku-4-5"] },
  { id: "openai",     label: "OpenAI",                    models: ["gpt-4o", "gpt-4o-mini"] },
  { id: "google",     label: "Google (Gemini)",           models: ["gemini-2.0-flash", "gemini-2.5-flash"] },
]

export default function AISettingsPage() {
  const [provider, setProvider] = useState("openrouter")
  const [model, setModel] = useState("google/gemma-4-26b-a4b-it")
  const [apiKey, setApiKey] = useState("")
  const [saved, setSaved] = useState(false)

  const selectedProvider = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0]

  const saveMutation = useMutation({
    mutationFn: () => fetch("/api/settings/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, apiKey }),
    }),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000) },
  })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-5 h-5 text-[var(--teal)]" />
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>AI Settings</h1>
          <p className="text-sm text-[var(--text-muted)]">Controls how Rapport generates personalized email content</p>
        </div>
      </div>

      <GlassCard className="p-6 space-y-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">Provider</label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => setProvider(p.id)}
                className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${
                  provider === p.id
                    ? "border-[var(--teal)] bg-[rgba(43,168,162,0.1)] text-[var(--teal-light)]"
                    : "border-[var(--surface-border)] text-[var(--text-muted)] hover:text-white"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 block">Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}
            className="input-premium">
            {selectedProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Recommended: <code className="text-[var(--teal)]">google/gemma-4-26b-a4b-it</code> — cheap, fast, good at short creative writing
          </p>
        </div>

        <GlassInput label="API Key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          placeholder={provider === "openrouter" ? "sk-or-v1-..." : "sk-..."} />

        <GlassButton onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="w-full">
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : "Save AI Settings"}
        </GlassButton>
      </GlassCard>
    </div>
  )
}
