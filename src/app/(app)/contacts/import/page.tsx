"use client"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, CheckCircle, AlertCircle, ArrowRight, FileText, X } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { cn } from "@/lib/utils"

const FIELD_MAP: Record<string, string> = {
  "first name": "firstName", "firstname": "firstName", "first_name": "firstName",
  "last name": "lastName", "lastname": "lastName", "last_name": "lastName",
  "name": "firstName",
  "email": "email", "email address": "email",
  "phone": "phone", "phone number": "phone", "mobile": "phone",
  "company": "companyName", "company name": "companyName", "business": "companyName",
  "title": "jobTitle", "job title": "jobTitle", "position": "jobTitle",
  "city": "city", "state": "state", "zip": "zip",
  "birthday": "birthdate", "birthdate": "birthdate", "dob": "birthdate",
  "anniversary": "anniversary",
  "spouse": "spouseName", "spouse name": "spouseName",
  "hobbies": "hobbies", "hobby": "hobbies",
  "notes": "internalNotes", "note": "internalNotes",
  "facebook": "facebookUrl", "linkedin": "linkedinUrl",
  "instagram": "instagramUrl", "twitter": "twitterUrl", "tiktok": "tiktokUrl",
  "website": "websiteUrl",
  "college": "college", "university": "college",
  "car": "carType", "vehicle": "carType",
  "hometown": "placeHometown",
}

function mapHeader(h: string): string {
  return FIELD_MAP[h.toLowerCase().trim()] ?? h
}

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<"upload" | "map" | "importing" | "done">("upload")
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")

  const onFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|xlsx?)$/i)) { setError("Please upload a CSV or Excel file"); return }
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (result) => {
        const h = result.meta.fields ?? []
        setHeaders(h)
        setRows(result.data as Record<string, string>[])
        const autoMap: Record<string, string> = {}
        h.forEach(head => { autoMap[head] = mapHeader(head) })
        setFieldMap(autoMap)
        setStep("map")
      },
      error: (e) => setError(e.message),
    })
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  const runImport = async () => {
    setStep("importing")
    const mapped = rows.map(row => {
      const out: Record<string, string> = {}
      headers.forEach(h => { if (fieldMap[h]) out[fieldMap[h]] = row[h] ?? "" })
      return out
    })

    const BATCH = 50
    for (let i = 0; i < mapped.length; i += BATCH) {
      await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: mapped.slice(i, i + BATCH) }),
      })
      setProgress(Math.round(((i + BATCH) / mapped.length) * 100))
    }
    setStep("done")
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-h1 text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Import Contacts</h1>
        <p className="text-sm text-[var(--text-muted)]">Upload a CSV or spreadsheet — we'll map the columns automatically</p>
      </div>

      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-4 cursor-pointer transition-all",
                dragging ? "border-[var(--teal)] bg-[rgba(43,168,162,0.08)]" : "border-[var(--surface-border)] hover:border-[var(--teal)] hover:bg-[rgba(43,168,162,0.04)]"
              )}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--teal-dark), var(--teal))", boxShadow: "var(--shadow-teal-glow)" }}>
                <Upload className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white mb-1">Drop your file here</p>
                <p className="text-sm text-[var(--text-muted)]">CSV or Excel supported · any column layout</p>
              </div>
              <input id="file-input" type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>
            {error && <p className="mt-3 text-sm text-[var(--coral)] flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
          </motion.div>
        )}

        {step === "map" && (
          <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-white">{rows.length.toLocaleString()} contacts ready</p>
                  <p className="text-xs text-[var(--text-muted)]">Review column mapping — we auto-detected what we could</p>
                </div>
                <GlassButton size="sm" variant="ghost" onClick={() => setStep("upload")}>
                  <X className="w-3.5 h-3.5" /> Change file
                </GlassButton>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {headers.map(h => (
                  <div key={h} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50">
                    <p className="text-xs text-[var(--text-muted)] w-28 shrink-0 truncate" title={h}>{h}</p>
                    <ArrowRight className="w-3 h-3 text-[var(--teal)] shrink-0" />
                    <select
                      value={fieldMap[h] ?? ""}
                      onChange={e => setFieldMap(prev => ({ ...prev, [h]: e.target.value }))}
                      className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
                    >
                      <option value="">— skip —</option>
                      {["firstName","lastName","nickname","email","phone","companyName","jobTitle","city","state","zip","birthdate","anniversary","spouseName","spouseOccupation","college","hobbies","carType","placeHometown","internalNotes","facebookUrl","linkedinUrl","instagramUrl","twitterUrl","tiktokUrl","websiteUrl","tags"].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Preview */}
            <GlassCard className="p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Preview (first 3 rows)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {headers.filter(h => fieldMap[h]).map(h => (
                        <th key={h} className="text-left px-2 py-1 text-[var(--teal)] font-semibold">{fieldMap[h]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        {headers.filter(h => fieldMap[h]).map(h => (
                          <td key={h} className="px-2 py-1 text-[var(--text-secondary)] max-w-[120px] truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <GlassButton onClick={runImport} className="w-full" size="lg">
              <Upload className="w-4 h-4" /> Import {rows.length.toLocaleString()} Contacts
            </GlassButton>
          </motion.div>
        )}

        {step === "importing" && (
          <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 py-20">
            <div className="w-20 h-20 rounded-full border-4 border-[var(--teal)] border-t-transparent animate-spin" />
            <div className="text-center">
              <p className="text-xl font-bold text-white mb-2">Importing contacts…</p>
              <p className="text-[var(--text-muted)]">{progress}% complete</p>
            </div>
            <div className="w-64 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--teal)] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-20">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--teal-dark), var(--teal))", boxShadow: "var(--shadow-teal-glow)" }}>
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {rows.length.toLocaleString()} contacts imported!
              </h2>
              <p className="text-[var(--text-muted)]">Rapport is now monitoring their milestones</p>
            </div>
            <GlassButton onClick={() => router.push("/contacts")} size="lg">
              View Contacts <ArrowRight className="w-4 h-4" />
            </GlassButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
