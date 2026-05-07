"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Heart, Building, Mail, CheckCircle, ArrowRight } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import { GlassInput } from "@/components/ui/glass-input"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    businessName: "", fromName: "", fromEmail: "", replyTo: "",
  })

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async () => {
    setLoading(true)
    try {
      await fetch("/api/onboarding/create-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      router.push("/dashboard")
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--surface-base)" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1E8C86, #2BA8A2)", boxShadow: "0 8px 32px rgba(43,168,162,0.4)" }}>
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Rapport</h1>
            <p className="text-xs text-[var(--text-muted)]">McKay 66 Relationship Engine</p>
          </div>
        </div>

        <GlassCard className="p-8">
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Set up your account
                </h2>
                <p className="text-sm text-[var(--text-muted)]">Tell us about your business — this appears on every email you send</p>
              </div>

              <GlassInput label="Business Name" placeholder="Luther Pools" value={form.businessName} onChange={update("businessName")} />
              <GlassInput label="Your Name (appears as sender)" placeholder="Alex Luther" value={form.fromName} onChange={update("fromName")} />
              <GlassInput label="From Email" type="email" placeholder="alex@lutherpools.com" value={form.fromEmail} onChange={update("fromEmail")} />
              <GlassInput label="Reply-To Email (optional)" type="email" placeholder="same as above" value={form.replyTo} onChange={update("replyTo")} />

              <GlassButton
                className="w-full"
                size="lg"
                disabled={!form.businessName || !form.fromName || !form.fromEmail}
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </GlassButton>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                  You're almost ready
                </h2>
                <p className="text-sm text-[var(--text-muted)]">Review your setup and launch Rapport</p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Building, label: "Business", value: form.businessName },
                  { icon: Heart, label: "Sender Name", value: form.fromName },
                  { icon: Mail, label: "From Email", value: form.fromEmail },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50">
                    <Icon className="w-4 h-4 text-[var(--teal)] shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
                      <p className="text-sm text-white font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <GlassButton variant="ghost" size="md" onClick={() => setStep(1)} className="flex-1">Back</GlassButton>
                <GlassButton size="lg" className="flex-1" onClick={submit} loading={loading}>
                  Launch Rapport <CheckCircle className="w-4 h-4" />
                </GlassButton>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}
