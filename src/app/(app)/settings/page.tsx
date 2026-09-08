"use client"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { Mail, Brain, User, CreditCard, CalendarClock } from "lucide-react"

const SETTINGS_CARDS = [
  { href: "/settings/profile", icon: User, label: "Business profile", description: "Your name, business name, reply-to and the mailing address printed in every note" },
  { href: "/settings/billing", icon: CreditCard, label: "Billing", description: "Plan, seats, invoices and payment method" },
  { href: "/settings/email", icon: Mail, label: "Sending mailbox", description: "Connect Gmail or Microsoft 365 in one click, set the daily send cap, and check SPF, DKIM and DMARC" },
  { href: "/settings/cadence", icon: CalendarClock, label: "Timing", description: "How far ahead renewal notes go out, and the months-since-close check-ins" },
  { href: "/settings/ai", icon: Brain, label: "AI / LLM", description: "Set your OpenRouter, Anthropic, OpenAI, or Google API key and model" },
]

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-h1 text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Settings</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">Configure your Rapport account</p>

      <div className="space-y-3">
        {SETTINGS_CARDS.map(({ href, icon: Icon, label, description }) => (
          <Link key={href} href={href}>
            <GlassCard className="p-5 flex items-center gap-4 cursor-pointer hover:border-[var(--teal)] transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(43,168,162,0.12)" }}>
                <Icon className="w-5 h-5 text-[var(--teal)]" />
              </div>
              <div>
                <p className="font-semibold text-white">{label}</p>
                <p className="text-sm text-[var(--text-muted)]">{description}</p>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  )
}
