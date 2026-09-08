"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import { User } from "lucide-react"

type Profile = { businessName: string; fromName: string; fromEmail: string; replyTo: string | null; postalAddress: string; timezone: string }

export default function ProfileSettingsPage() {
  const qc = useQueryClient()
  const q = useQuery<Profile>({ queryKey: ["profile"], queryFn: () => fetch("/api/settings/profile").then(r => r.json()) })
  const [edits, setEdits] = useState<Partial<Profile>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const form: Partial<Profile> = { ...(q.data ?? {}), ...edits }

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/settings/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not save")
    },
    onSuccess: () => { setMsg("Saved."); qc.invalidateQueries({ queryKey: ["profile"] }) },
    onError: (e: Error) => setMsg(e.message),
  })

  const field = (k: keyof Profile, label: string, hint?: string) => (
    <label className="block">
      <span className="text-sm text-white">{label}</span>
      {hint && <span className="block text-xs text-[var(--text-muted)] mb-1">{hint}</span>}
      <GlassInput value={(form[k] as string) ?? ""} onChange={(e) => setEdits({ ...edits, [k]: e.target.value })} />
    </label>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-5 h-5 text-[var(--teal)]" />
        <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Business profile</h1>
      </div>
      <GlassCard className="p-6 space-y-4">
        {field("businessName", "Business name", "Shown in the header of every note.")}
        {field("fromName", "Your name", "Notes are signed with it.")}
        {field("replyTo", "Reply-to address", "Where replies land. Defaults to your sending mailbox.")}
        {field("postalAddress", "Mailing address", "Required by US law (CAN-SPAM) in the footer of every note. Street, city, state, ZIP.")}
        {field("timezone", "Time zone", "IANA name, for example America/Los_Angeles.")}
        <div className="flex items-center gap-3">
          <GlassButton onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving" : "Save"}</GlassButton>
          {msg && <span className="text-sm text-[var(--text-muted)]">{msg}</span>}
        </div>
      </GlassCard>
    </div>
  )
}
