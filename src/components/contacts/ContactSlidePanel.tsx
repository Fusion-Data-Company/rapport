"use client"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { X, Edit2, Save, Mail, Phone, Heart, Star, Briefcase, Dumbbell, Globe, CalendarClock, Plus, Trash2, History, Send, MessageSquare, PhoneCall, Users } from "lucide-react"
import { FacebookIcon, LinkedInIcon, InstagramIcon, TikTokIcon, XIcon } from "@/components/ui/social-icons"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"
import { cn, formatDate, getInitials } from "@/lib/utils"
import type { ContactDateRow, ContactTimelineRow, ContactWithRelations } from "@/lib/types"
import { KIND_LABEL, TIMELINE_KINDS, type TimelineKind } from "@/lib/timeline-kinds"

type Contact = ContactWithRelations

interface Props {
  contact: Contact
  onClose: () => void
  onUpdate: (id: string, field: string, value: unknown) => Promise<void>
}

type Section = "overview" | "dates" | "history" | "family" | "business" | "lifestyle" | "notes"

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--surface-border)] pb-4 mb-4 last:border-0 last:mb-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-[var(--teal)]" />
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--teal)]">{title}</h4>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Field({ label, value, field, contactId, onUpdate, multiline = false, placeholder }: {
  label: string; value: string | null | undefined; field: string;
  contactId: string; onUpdate: (id: string, f: string, v: unknown) => Promise<void>
  multiline?: boolean; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")

  const save = async () => {
    await onUpdate(contactId, field, draft || null)
    setEditing(false)
  }

  return (
    <div className="group">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">{label}</p>
      {editing ? (
        <div className="flex gap-2">
          {multiline ? (
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              className="input-premium text-sm flex-1 resize-none" rows={3} autoFocus />
          ) : (
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder}
              className="input-premium text-sm flex-1" autoFocus onKeyDown={e => e.key === "Enter" && save()} />
          )}
          <button onClick={save} className="text-[var(--teal)] hover:text-[var(--teal-light)]">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setDraft(value ?? ""); setEditing(false) }} className="text-[var(--text-muted)]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="text-sm text-[var(--text-primary)] cursor-text hover:bg-slate-800/50 rounded px-1 -ml-1 py-0.5 transition-colors min-h-[22px]"
        >
          {value || <span className="text-[var(--text-muted)] italic">Click to add{placeholder ? ` (${placeholder})` : ""}</span>}
        </p>
      )}
    </div>
  )
}

/** The dates an agent gets paid on, and anything else they want remembered. */
function CustomDates({ contactId, seeded }: { contactId: string; seeded?: ContactDateRow[] }) {
  const qc = useQueryClient()
  const key = ["contact-dates", contactId]
  const { data = seeded ?? [], isLoading } = useQuery<ContactDateRow[]>({
    queryKey: key,
    queryFn: () => fetch(`/api/contacts/${contactId}/dates`).then(r => r.json()),
    initialData: seeded,
  })
  const [label, setLabel] = useState("")
  const [date, setDate] = useState("")
  const [recurrence, setRecurrence] = useState<"annual" | "once">("annual")
  const [error, setError] = useState<string | null>(null)

  const add = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/contacts/${contactId}/dates`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, date, recurrence }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not add that date")
      return d
    },
    onSuccess: () => { setLabel(""); setDate(""); setError(null); qc.invalidateQueries({ queryKey: key }) },
    onError: (e: Error) => setError(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => fetch(`/api/contacts/${contactId}/dates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  return (
    <div className="space-y-2.5">
      {isLoading && <p className="text-xs text-[var(--text-muted)]">Loading dates</p>}
      {!isLoading && data.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] italic">No custom dates yet. A licence renewal, the date you first met, the day their business opened.</p>
      )}
      {data.map((d) => (
        <div key={d.id} className="flex items-center gap-2 group">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate">{d.label}</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {formatDate(d.date, { month: "long", day: "numeric", ...(d.recurrence === "once" ? { year: "numeric" } : {}) })}
              {d.recurrence === "annual" ? " · every year" : " · once"}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Remove ${d.label}`}
            onClick={() => remove.mutate(d.id)}
            className="text-[var(--text-muted)] hover:text-[var(--coral)] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <div className="pt-2 border-t border-[var(--surface-border)] space-y-2">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="What is the date?" className="input-premium text-sm w-full" />
        <div className="flex gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-premium text-sm flex-1" />
          <select value={recurrence} onChange={e => setRecurrence(e.target.value as "annual" | "once")} className="input-premium text-sm">
            <option value="annual">Every year</option>
            <option value="once">Once</option>
          </select>
        </div>
        <GlassButton size="sm" disabled={!label.trim() || !date} loading={add.isPending} onClick={() => { setError(null); add.mutate() }}>
          <Plus className="w-3.5 h-3.5" /> Add date
        </GlassButton>
        {error && <p className="text-xs text-[var(--coral)]">{error}</p>}
      </div>
    </div>
  )
}


const KIND_ICON: Record<TimelineKind, React.ElementType> = {
  note: Edit2, sent: Send, reply: MessageSquare, call: PhoneCall, meeting: Users,
}

/**
 * What actually happened. The writer reads the last five entries before it drafts,
 * so a note can pick up the real last conversation instead of the static profile.
 */
function Timeline({ contactId }: { contactId: string }) {
  const qc = useQueryClient()
  const key = ["contact-timeline", contactId]
  const { data = [], isLoading, isError } = useQuery<ContactTimelineRow[]>({
    queryKey: key,
    queryFn: () => fetch(`/api/contacts/${contactId}/timeline`).then(r => r.json()),
  })
  const [kind, setKind] = useState<TimelineKind>("note")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  const add = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/contacts/${contactId}/timeline`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "Could not save that")
      return d
    },
    onSuccess: () => { setBody(""); setError(null); qc.invalidateQueries({ queryKey: key }) },
    onError: (e: Error) => setError(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => fetch(`/api/contacts/${contactId}/timeline/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {TIMELINE_KINDS.filter(k => k !== "sent").map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors",
                kind === k
                  ? "border-[var(--teal)] bg-[rgba(43,168,162,0.12)] text-[var(--teal-light)]"
                  : "border-[var(--surface-border)] text-[var(--text-muted)] hover:text-white"
              )}
            >{KIND_LABEL[k]}</button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          placeholder={kind === "reply" ? "Paste what they wrote back" : kind === "call" ? "What did you talk about?" : "What happened?"}
          className="input-premium text-sm w-full resize-none"
        />
        <GlassButton size="sm" disabled={!body.trim()} loading={add.isPending} onClick={() => { setError(null); add.mutate() }}>
          <Plus className="w-3.5 h-3.5" /> Add to history
        </GlassButton>
        {error && <p className="text-xs text-[var(--coral)]">{error}</p>}
      </div>

      <div className="pt-3 border-t border-[var(--surface-border)] space-y-3">
        {isLoading && <p className="text-xs text-[var(--text-muted)]">Loading history</p>}
        {isError && <p className="text-xs text-[var(--coral)]">Could not load the history. Reload the page.</p>}
        {!isLoading && !isError && data.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] italic">
            Nothing logged yet. Every note Rapport sends lands here on its own, and anything you add is read by the writer before the next one.
          </p>
        )}
        {data.map((entry, i) => {
          const Icon = KIND_ICON[entry.kind as TimelineKind] ?? Edit2
          return (
            <div key={entry.id} className="flex gap-2.5 group">
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  entry.kind === "sent" ? "bg-[rgba(43,168,162,0.15)]" : "bg-slate-800"
                )}>
                  <Icon className={cn("w-3 h-3", entry.kind === "sent" ? "text-[var(--teal)]" : "text-[var(--text-muted)]")} />
                </div>
                {i < data.length - 1 && <div className="w-px flex-1 bg-[var(--surface-border)] mt-1" />}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {KIND_LABEL[entry.kind as TimelineKind] ?? entry.kind}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">{formatDate(entry.occurredAt)}</p>
                  {i < 5 && <span className="text-[10px] text-[var(--teal)]">read by the writer</span>}
                </div>
                {entry.summary && <p className="text-sm text-white truncate">{entry.summary}</p>}
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">{entry.body}</p>
              </div>
              <button
                type="button"
                aria-label="Remove entry"
                onClick={() => remove.mutate(entry.id)}
                className="text-[var(--text-muted)] hover:text-[var(--coral)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "overview",  label: "Overview",  icon: Star },
  { key: "dates",     label: "Dates",     icon: CalendarClock },
  { key: "history",   label: "History",   icon: History },
  { key: "family",    label: "Family",    icon: Heart },
  { key: "business",  label: "Business",  icon: Briefcase },
  { key: "lifestyle", label: "Lifestyle", icon: Dumbbell },
  { key: "notes",     label: "Notes",     icon: Edit2 },
]

export default function ContactSlidePanel({ contact, onClose, onUpdate }: Props) {
  const [activeSection, setActiveSection] = useState<Section>("overview")

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className="slide-panel w-[420px] shrink-0 flex flex-col"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--surface-border)] flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, var(--teal-dark), var(--teal))", boxShadow: "var(--shadow-teal-glow)" }}>
            {getInitials(contact.firstName, contact.lastName)}
          </div>
          <div>
            <h2 className="font-bold text-white text-h2" style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px" }}>
              {contact.firstName} {contact.lastName ?? ""}
              {contact.nickname && <span className="text-sm font-normal text-[var(--text-muted)] ml-1">&ldquo;{contact.nickname}&rdquo;</span>}
            </h2>
            {contact.jobTitle && <p className="text-sm text-[var(--teal-light)]">{contact.jobTitle}{contact.companyName && ` · ${contact.companyName}`}</p>}
          </div>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick contacts */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--surface-border)] shrink-0">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-[var(--teal-light)] hover:underline truncate">
            <Mail className="w-3.5 h-3.5 shrink-0" />{contact.email}
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-[var(--sky)] hover:underline">
            <Phone className="w-3.5 h-3.5 shrink-0" />{contact.phone}
          </a>
        )}
      </div>

      {/* Social row */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[var(--surface-border)] shrink-0">
        {[
          { icon: FacebookIcon, url: contact.facebookUrl, field: "facebookUrl" },
          { icon: LinkedInIcon, url: contact.linkedinUrl, field: "linkedinUrl" },
          { icon: InstagramIcon, url: contact.instagramUrl, field: "instagramUrl" },
          { icon: TikTokIcon, url: contact.tiktokUrl, field: "tiktokUrl" },
          { icon: XIcon, url: contact.twitterUrl, field: "twitterUrl" },
        ].map(({ icon: Icon, url, field }) => (
          <button key={field}
            onClick={() => {
              if (url) window.open(url, "_blank")
              else {
                const input = prompt(`Paste URL:`)
                if (input?.trim()) onUpdate(contact.id, field, input.trim())
              }
            }}
            className={cn("transition-all duration-150", url ? "opacity-100 hover:scale-110" : "opacity-20 hover:opacity-50 grayscale")}
          >
            <Icon size={26} />
          </button>
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-[var(--surface-border)] shrink-0 overflow-x-auto">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap",
              activeSection === key
                ? "border-[var(--teal)] text-[var(--teal-light)]"
                : "border-transparent text-[var(--text-muted)] hover:text-white"
            )}
          >
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeSection === "overview" && (
          <>
            <Section title="Contact Info" icon={Globe}>
              <Field label="Email" value={contact.email} field="email" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Phone" value={contact.phone} field="phone" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="City" value={contact.city} field="city" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="State" value={contact.state} field="state" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Hometown" value={contact.placeHometown} field="placeHometown" contactId={contact.id} onUpdate={onUpdate} />
            </Section>
            <Section title="Personal" icon={Star}>
              <Field label="Birthday" value={contact.birthdate ? formatDate(contact.birthdate, { month: "long", day: "numeric", year: "numeric" }) : null} field="birthdate" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Car" value={contact.carType} field="carType" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Hobbies" value={contact.hobbies} field="hobbies" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Vacation Style" value={contact.vacationHabits} field="vacationHabits" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Proudest Achievement" value={contact.proudestAchievement} field="proudestAchievement" contactId={contact.id} onUpdate={onUpdate} multiline />
            </Section>
          </>
        )}

        {activeSection === "dates" && (
          <>
            <Section title="The money dates" icon={CalendarClock}>
              <p className="text-xs text-[var(--text-muted)] -mt-1 mb-1">
                A birthday is a courtesy. These are the dates a renewal or a referral turns on.
              </p>
              <Field label="Policy renewal" value={contact.policyRenewalDate} field="policyRenewalDate" contactId={contact.id} onUpdate={onUpdate} placeholder="YYYY-MM-DD" />
              <Field label="Policy type" value={contact.policyType} field="policyType" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Loan closing date" value={contact.loanClosedDate} field="loanClosedDate" contactId={contact.id} onUpdate={onUpdate} placeholder="YYYY-MM-DD" />
              <Field label="Loan type" value={contact.loanType} field="loanType" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Home purchase date" value={contact.homePurchaseDate} field="homePurchaseDate" contactId={contact.id} onUpdate={onUpdate} placeholder="YYYY-MM-DD" />
            </Section>
            <Section title="Personal dates" icon={Heart}>
              <Field label="Birthday" value={contact.birthdate} field="birthdate" contactId={contact.id} onUpdate={onUpdate} placeholder="YYYY-MM-DD" />
              <Field label="Wedding anniversary" value={contact.anniversary} field="anniversary" contactId={contact.id} onUpdate={onUpdate} placeholder="YYYY-MM-DD" />
            </Section>
            <Section title="Custom dates" icon={CalendarClock}>
              <CustomDates contactId={contact.id} seeded={contact.customDates} />
            </Section>
          </>
        )}

        {activeSection === "history" && (
          <Section title="Interaction history" icon={History}>
            <Timeline contactId={contact.id} />
          </Section>
        )}

        {activeSection === "family" && (
          <Section title="Family" icon={Heart}>
            <Field label="Spouse Name" value={contact.spouseName} field="spouseName" contactId={contact.id} onUpdate={onUpdate} />
            <Field label="Spouse Occupation" value={contact.spouseOccupation} field="spouseOccupation" contactId={contact.id} onUpdate={onUpdate} />
            <Field label="Spouse Interests" value={contact.spouseInterests} field="spouseInterests" contactId={contact.id} onUpdate={onUpdate} />
            <Field label="Anniversary" value={contact.anniversary ? formatDate(contact.anniversary, { month: "long", day: "numeric" }) : null} field="anniversary" contactId={contact.id} onUpdate={onUpdate} />
          </Section>
        )}

        {activeSection === "business" && (
          <Section title="Business" icon={Briefcase}>
            <Field label="Company" value={contact.companyName} field="companyName" contactId={contact.id} onUpdate={onUpdate} />
            <Field label="Title" value={contact.jobTitle} field="jobTitle" contactId={contact.id} onUpdate={onUpdate} />
            <Field label="College" value={contact.college} field="college" contactId={contact.id} onUpdate={onUpdate} />
            <Field label="Professional Associations" value={contact.professionalAssociations} field="professionalAssociations" contactId={contact.id} onUpdate={onUpdate} multiline />
            <Field label="Long-Range Business Goal" value={contact.businessObjectiveLongRange} field="businessObjectiveLongRange" contactId={contact.id} onUpdate={onUpdate} multiline />
            <Field label="Immediate Business Goal" value={contact.businessObjectiveImmediate} field="businessObjectiveImmediate" contactId={contact.id} onUpdate={onUpdate} multiline />
          </Section>
        )}

        {activeSection === "lifestyle" && (
          <>
            <Section title="Dining" icon={Star}>
              <Field label="Fav Lunch Spot" value={contact.favoriteLunchRestaurant} field="favoriteLunchRestaurant" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Fav Dinner Spot" value={contact.favoriteDinnerRestaurant} field="favoriteDinnerRestaurant" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Fav Menu Items" value={contact.favoriteMenuItems} field="favoriteMenuItems" contactId={contact.id} onUpdate={onUpdate} />
            </Section>
            <Section title="Habits" icon={Dumbbell}>
              <Field label="Health Notes" value={contact.medicalHistory} field="medicalHistory" contactId={contact.id} onUpdate={onUpdate} />
              <Field label="Drink Preference" value={contact.drinkType} field="drinkType" contactId={contact.id} onUpdate={onUpdate} />
            </Section>
          </>
        )}

        {activeSection === "notes" && (
          <Section title="Notes" icon={Edit2}>
            <Field label="Internal Notes" value={contact.internalNotes} field="internalNotes" contactId={contact.id} onUpdate={onUpdate} multiline />
            <Field label="Sensitive Topics (DO NOT DISCUSS)" value={contact.sensitiveTopics} field="sensitiveTopics" contactId={contact.id} onUpdate={onUpdate} multiline />
            <Field label="Strong Feelings On" value={contact.strongFeelings} field="strongFeelings" contactId={contact.id} onUpdate={onUpdate} multiline />
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--surface-border)] flex gap-2 shrink-0">
        <GlassButton size="sm" className="flex-1" variant="ghost">
          <Mail className="w-3.5 h-3.5" /> Send Card
        </GlassButton>
        <GlassButton size="sm" variant="ghost" className="text-[var(--coral)] border-[var(--coral)]/20 hover:bg-[var(--coral)]/10">
          <X className="w-3.5 h-3.5" /> DNC
        </GlassButton>
      </div>
    </motion.div>
  )
}
