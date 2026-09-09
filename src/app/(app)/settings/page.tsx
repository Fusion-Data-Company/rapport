"use client"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { Mail, Brain, User, CreditCard, CalendarClock, Plug, ChevronRight } from "lucide-react"
import { Reveal } from "@/elite/motion"

const SETTINGS_CARDS = [
  { href: "/settings/profile", icon: User, label: "Business profile", description: "Your name, business name, reply-to and the mailing address printed in every note" },
  { href: "/settings/billing", icon: CreditCard, label: "Billing", description: "Plan, seats, invoices and payment method" },
  { href: "/settings/email", icon: Mail, label: "Sending mailbox", description: "Connect Gmail or Microsoft 365 in one click, set the daily send cap, and check SPF, DKIM and DMARC" },
  { href: "/settings/cadence", icon: CalendarClock, label: "Timing and review", description: "Whether every note waits for your approval, how far ahead renewal notes go out, and the months-since-close check-ins" },
  { href: "/settings/integrations", icon: Plug, label: "Integrations", description: "Signed webhooks for every send event, and the URL your AMS, CRM or Zapier posts contacts to" },
  { href: "/settings/ai", icon: Brain, label: "AI / LLM", description: "Set your OpenRouter, Anthropic, OpenAI, or Google API key and model" },
]

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Reveal>
        <p className="stat-label">Your account</p>
        <h1 className="rp-h1 mt-1.5 mb-1">Settings</h1>
        <p className="text-[15px] leading-[1.6] mb-8" style={{ color: "var(--text-secondary)" }}>
          Six things, and only the mailbox is required. Everything else has a working default.
        </p>
      </Reveal>

      <div className="space-y-3">
        {SETTINGS_CARDS.map(({ href, icon: Icon, label, description }, i) => (
          <Reveal key={href} delay={i * 55}>
            <Link href={href} className="block">
              <GlassCard className="p-5 flex items-center gap-4 cursor-pointer hairline-trim hover-lift">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(43,168,162,0.14)", boxShadow: "inset 0 0 0 1px var(--rp-line-highlight)" }}>
                  <Icon className="w-5 h-5" style={{ color: "var(--teal-light)" }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                  <p className="text-[13.5px] leading-[1.6]" style={{ color: "var(--text-secondary)" }}>{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto shrink-0" style={{ color: "var(--text-muted)" }} />
              </GlassCard>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
