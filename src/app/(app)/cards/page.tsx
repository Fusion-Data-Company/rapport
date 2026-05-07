"use client"
import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { Upload, CreditCard, Cake, Heart, Baby, Smile, Trophy, X, Plus, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

const OCCASIONS = [
  { type: "birthday",       label: "Birthday",       icon: Cake,    color: "var(--teal)" },
  { type: "anniversary",    label: "Anniversary",    icon: Heart,   color: "var(--coral)" },
  { type: "child_birthday", label: "Child's Birthday", icon: Baby, color: "var(--sky)" },
  { type: "get_well",       label: "Get Well Soon",  icon: Smile,   color: "var(--gold)" },
  { type: "sports_win",     label: "Sports Win",     icon: Trophy,  color: "var(--gold)" },
  { type: "sports_loss",    label: "Better Luck",    icon: Trophy,  color: "var(--text-muted)" },
  { type: "appreciation",   label: "Appreciation",   icon: CreditCard, color: "var(--teal)" },
  { type: "new_baby",       label: "New Baby",       icon: Baby,    color: "var(--sky)" },
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
      if (!res.ok) throw new Error("Upload failed")
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
          <p className="text-sm text-[var(--text-muted)]">Greeting cards embedded in milestone emails</p>
        </div>
        <GlassButton size="sm" onClick={() => document.getElementById("card-upload")?.click()} loading={uploadMutation.isPending}>
          <Upload className="w-3.5 h-3.5" /> Upload Cards
        </GlassButton>
        <input id="card-upload" type="file" accept="image/*" multiple className="hidden"
          onChange={e => Array.from(e.target.files ?? []).forEach(f => uploadMutation.mutate(f))} />
      </div>

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
          {dragging ? "Drop to upload…" : "Drag images here to upload — or click Upload Cards above"}
        </p>
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
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {cards.map((card: any) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative"
              >
                <GlassCard className="overflow-hidden p-0 aspect-[3/2]">
                  <img src={card.imageUrl} alt={card.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
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
                      <span className="badge badge-teal text-[9px]">System</span>
                    </div>
                  )}
                </GlassCard>
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
              className="max-w-full max-h-full object-contain rounded-2xl"
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
