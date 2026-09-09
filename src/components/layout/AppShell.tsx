"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { motion } from "framer-motion"
import {
  LayoutDashboard, Users, CreditCard,
  Calendar, Settings, ChevronRight, Heart
} from "lucide-react"
import { cn } from "@/lib/utils"
import Paige from "@/components/Paige"
import { daysUntil } from "@/lib/billing-ui"

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/contacts",  icon: Users,           label: "Contacts" },
  { href: "/cards",     icon: CreditCard,      label: "Card Gallery" },
  { href: "/schedule",  icon: Calendar,        label: "Today" },
  { href: "/settings",  icon: Settings,        label: "Settings" },
]

export default function AppShell({ children, plan, subscriptionStatus, trialEndsAt }: {
  children: React.ReactNode
  plan?: string
  subscriptionStatus?: string
  trialEndsAt?: string | null
}) {
  const pathname = usePathname()
  const daysLeft = daysUntil(trialEndsAt)
  const planLabel =
    subscriptionStatus === "active" ? `${plan === "pro" ? "Pro" : "Paid"} Plan`
    : subscriptionStatus === "trialing" ? (daysLeft !== null ? `Trial · ${daysLeft}d left` : "Free Trial")
    : "No active plan"

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-base)" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col overflow-y-auto"
        style={{ background: "var(--rp-surface-1)", boxShadow: "inset -1px 0 0 var(--rp-line)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ boxShadow: "inset 0 -1px 0 var(--rp-line)" }}>
          {/* The logo shine holds at 20%/80% — the bar crosses and then WAITS,
              which is what keeps a header mark from reading as a spinner. */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center logo-shine"
            style={{ background: "linear-gradient(135deg, var(--teal-light), var(--teal))", boxShadow: "var(--shadow-teal-glow)" }}>
            <Heart className="w-4 h-4" style={{ color: "#04201E" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Rapport</p>
            <p className="stat-label" style={{ fontSize: 9 }}>Relationship autopilot</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={cn("nav-item", active && "active")}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 flex items-center gap-3" style={{ boxShadow: "inset 0 1px 0 var(--rp-line)" }}>
          <UserButton appearance={{
            elements: {
              avatarBox: "w-8 h-8 ring-1 ring-[var(--teal)] ring-offset-1 ring-offset-[var(--surface-base)]",
            }
          }} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">My Account</p>
            <Link href="/settings/billing" className="text-[10px] text-[var(--text-muted)] hover:text-[var(--teal)]">{planLabel}</Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto relative">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </main>

      {/* Paige widget */}
      <Paige />
    </div>
  )
}
