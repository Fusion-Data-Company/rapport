"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { motion } from "framer-motion"
import {
  LayoutDashboard, Users, CreditCard, Activity,
  Calendar, Settings, ChevronRight, Heart
} from "lucide-react"
import { cn } from "@/lib/utils"
import Paige from "@/components/Paige"

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/contacts",  icon: Users,           label: "Contacts" },
  { href: "/cards",     icon: CreditCard,      label: "Card Gallery" },
  { href: "/sports",    icon: Activity,        label: "Sports Monitor" },
  { href: "/schedule",  icon: Calendar,        label: "Schedule" },
  { href: "/settings",  icon: Settings,        label: "Settings" },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-base)" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-[var(--surface-border)] overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--surface-border)]">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--teal), var(--teal-dark))", boxShadow: "var(--shadow-teal-glow)" }}>
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Rapport</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">CRM</p>
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
        <div className="p-4 border-t border-[var(--surface-border)] flex items-center gap-3">
          <UserButton appearance={{
            elements: {
              avatarBox: "w-8 h-8 ring-1 ring-[var(--teal)] ring-offset-1 ring-offset-[var(--surface-base)]",
            }
          }} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">My Account</p>
            <p className="text-[10px] text-[var(--text-muted)]">Starter Plan</p>
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
