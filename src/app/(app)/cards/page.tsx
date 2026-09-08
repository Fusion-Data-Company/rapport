"use client"
import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { Upload, CreditCard, Cake, Heart, Baby, FileText, KeyRound, Landmark, Coffee, Star, X, Plus, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CardTemplateRow } from "@/lib/types"

// The occasions the scheduler can actually raise. Anything else is a card nobody
// will ever send, and the old sports-CRM list was exactly that.
const OCCASIONS = [
  { type: "birthday",           label: "Birthday",          icon: Cake,     color: "var(--teal)" },
  { type: "anniversary",        label: "Anniversary",       icon: Heart,    color: "var(--coral)" },
  { type: "child_birthday",     label: "Child's Birthday",  icon: Baby,     color: "var(--sky)" },
  { type: "policy_renewal",     label: "Policy Renewal",    icon: FileText, color: "var(--gold)" },
  { type: "home_anniversary",   label: "Home Anniversary",  icon: KeyRound, color: "var(--teal)" },
  { type: "loan_anniversary",   label: "Loan Anniversary",  icon: Landmark, color: "var(--teal)" },
  { type: "months_since_close", label: "Since Closing",     icon: Coffee,   color: "var(--gold)" },
  { type: "review_request",     label: "Review Request",    icon: Star,     color: "var(--coral)" },
] as const

type OccasionType = typeof OCCASIONS[number]["type"]

export default function CardsPage() {
  const qc = useQueryClient()
  const [activeOccasion, setActiveOccasion] = useState<OccasionType>("birthday")
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const { data: cards = [] } = useQuery({
    queryKey: ["cards", activeOccasion],
    queryFn: () => fetch(`/api/cards?occasion=${activeOccasion}`).then(r => r.json()),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("occasionType", activeOccasion)
      const res = await fetch("/api/cards/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Upload failed")
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/cards/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  })

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    files.forEach(f => uploadMutation.mutate(f))
  }, [uploadMutation])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Card Gallery</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Every note goes out with a card, and the card carries the contact&apos;s own name.
            These are the Rapport cards for each occasion; the name is set at send time.
          </p>
        </div>
        <GlassButton size="sm" onClick={() => document.getElementById("card-upload")?.click()} loading={uploadMutation.isPending}>
          <Upload className="w-3.5 h-3.5" /> Upload Cards
        </GlassButton>
        <input id="card-upload" type="file" accept="image/*" multiple className="hidden"
          onChange={e => Array.from(e.target.files ?? []).forEach(f => uploadMutation.mutate(f))} />
      </div>

      {/* What runtime generation does with the sender's own line. Both of these were
          made by the same prompt the send path builds - same brief, different name and
          a different line from the sender - so the gallery is not describing a feature,
          it is showing two of its outputs. */}
      <GlassCard className="p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex gap-3 shrink-0">
            <figure className="w-24 sm:w-28">
              <img src="/img/cards/examples/runtime-rob.jpg" alt="Happy Birthday, Rob"
                className="w-full rounded-lg border border-[var(--surface-border)] shadow-[var(--shadow-md)] bg-white" />
              <figcaption className="mt-1.5 text-[10px] text-[var(--text-muted)] leading-tight">
                &ldquo;he just got a golden retriever puppy&rdquo;
              </figcaption>
            </figure>
            <figure className="w-24 sm:w-28">
              <img src="/img/cards/examples/runtime-maddie.jpg" alt="Happy Birthday, Maddie"
                className="w-full rounded-lg border border-[var(--surface-border)] shadow-[var(--shadow-md)] bg-white" />
              <figcaption className="mt-1.5 text-[10px] text-[var(--text-muted)] leading-tight">
                &ldquo;turning seven and mad about horses&rdquo;
              </figcaption>
            </figure>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold)] font-semibold">
              Made for the person
            </p>
            <h2 className="text-white font-semibold mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              The name is printed on the card, not typed under it
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Every note carries a card set for that contact, in foil script on cardstock.
              Add a line about them on the Schedule page before you approve and it goes into
              the brief - look at the puppy in the wreath and the horseshoe in the confetti.
              Until generation is switched on for your account, the Rapport card below for
              the occasion goes out instead, and it still carries a name.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Occasion tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {OCCASIONS.map(({ type, label, icon: Icon, color }) => (
          <button key={type}
            onClick={() => setActiveOccasion(type)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border",
              activeOccasion === type
                ? "text-white border-transparent"
                : "text-[var(--text-muted)] border-[var(--surface-border)] hover:text-white hover:border-[var(--surface-border-hover)]"
            )}
            style={activeOccasion === type ? { background: `linear-gradient(135deg, ${color}33, ${color}22)`, borderColor: color, color } : {}}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: activeOccasion === type ? color : undefined }} />
            {label}
            <span className="badge badge-gray text-[10px] px-1.5">{activeOccasion === type ? cards.length : ""}</span>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 mb-6 text-center transition-all",
          dragging ? "border-[var(--teal)] bg-[rgba(43,168,162,0.08)]" : "border-[var(--surface-border)]"
        )}
      >
        <p className="text-sm text-[var(--text-muted)]">
          {dragging ? "Drop to upload…" : "Drag images here to upload - or click Upload Cards above"}
        </p>
        {uploadMutation.isError && (
          <p className="text-xs text-red-400 mt-2">{(uploadMutation.error as Error).message}</p>
        )}
      </div>

      {/* Cards grid */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <CreditCard className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)]">No {activeOccasion.replace("_", " ")} cards yet</p>
          <GlassButton size="sm" onClick={() => document.getElementById("card-upload")?.click()}>
            <Plus className="w-3.5 h-3.5" /> Upload First Card
          </GlassButton>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          <AnimatePresence>
            {cards.map((card: CardTemplateRow) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative"
              >
                {/* A greeting card is portrait, and it is never cropped: object-cover on
                    a 3:2 tile cut the printed name off the bottom of every one of them. */}
                <GlassCard className="overflow-hidden p-0 aspect-[4/5] bg-white/[0.03]">
                  <img src={card.thumbnailUrl ?? card.imageUrl} alt={card.description ?? card.name}
                    loading="lazy"
                    className="w-full h-full object-contain transition-transform group-hover:scale-[1.03]" />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                    <p className="text-xs font-semibold text-white truncate">{card.name}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setPreview(card.imageUrl)}
                        className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
                        <Eye className="w-3.5 h-3.5 text-white" />
                      </button>
                      {!card.isSystem && (
                        <button onClick={() => deleteMutation.mutate(card.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/60 hover:bg-red-500/80 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                  {card.isSystem && (
                    <div className="absolute top-2 left-2">
                      <span className="badge badge-teal text-[9px]">Rapport</span>
                    </div>
                  )}
                </GlassCard>
                {/* What the card actually says, with <name> standing in for whoever it
                    is being made for. An agent should never have to open a card to
                    find out what line it prints. */}
                <p className="mt-2 text-[11px] leading-snug text-[var(--text-secondary)] line-clamp-2">
                  {card.description ?? card.name}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8"
            onClick={() => setPreview(null)}>
            <motion.img src={preview} alt="Card preview"
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-[var(--shadow-lg)]"
              onClick={e => e.stopPropagation()} />
            <button onClick={() => setPreview(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
