"use client"
import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import { X } from "lucide-react"

type Field = { key: string; label: string; type?: string; hint?: string }

const GROUPS: { title: string; note?: string; fields: Field[] }[] = [
  {
    title: "Who they are",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email", type: "email", hint: "Notes go here. No email, no note." },
      { key: "phone", label: "Phone" },
      { key: "companyName", label: "Company" },
      { key: "jobTitle", label: "Title" },
    ],
  },
  {
    title: "The money dates",
    note: "A birthday is a courtesy. These are the dates a renewal or a referral turns on. Leave blank what you do not have.",
    fields: [
      { key: "policyRenewalDate", label: "Policy renewal", type: "date" },
      { key: "policyType", label: "Policy type", hint: "Auto, home, term life" },
      { key: "loanClosedDate", label: "Loan closing date", type: "date" },
      { key: "loanType", label: "Loan type", hint: "30-year fixed, FHA" },
      { key: "homePurchaseDate", label: "Home purchase date", type: "date" },
    ],
  },
  {
    title: "Personal",
    fields: [
      { key: "birthdate", label: "Birthday", type: "date" },
      { key: "anniversary", label: "Wedding anniversary", type: "date" },
      { key: "spouseName", label: "Spouse or partner" },
      { key: "placeHometown", label: "Hometown" },
      { key: "college", label: "College" },
      { key: "hobbies", label: "Hobbies and interests" },
    ],
  },
]

export function AddContactDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const body: Record<string, string> = {}
      for (const [k, v] of Object.entries(form)) if (v.trim()) body[k] = v.trim()
      const r = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error ?? "Could not add the contact."); return }
      setForm({}); onCreated(); onClose()
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Add contact">
      <GlassCard className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Add a contact</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--text-muted)] hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5">
          {GROUPS.map((g) => (
            <fieldset key={g.title}>
              <legend className="text-[10px] font-bold uppercase tracking-widest text-[var(--teal)] mb-1">{g.title}</legend>
              {g.note && <p className="text-xs text-[var(--text-muted)] mb-2">{g.note}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {g.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs text-[var(--text-muted)]">{f.label}{f.key === "firstName" ? " *" : ""}</span>
                    <GlassInput type={f.type ?? "text"} value={form[f.key] ?? ""} required={f.key === "firstName"} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                    {f.hint && <span className="text-[11px] text-[var(--text-muted)]">{f.hint}</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="flex items-center gap-3 mt-2">
            <GlassButton type="submit" disabled={busy}>{busy ? "Adding" : "Add contact"}</GlassButton>
            <button type="button" onClick={onClose} className="text-sm text-[var(--text-muted)]">Cancel</button>
            {error && <span className="text-sm text-[var(--coral)]">{error}</span>}
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
