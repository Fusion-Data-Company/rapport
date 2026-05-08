"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { motion } from "framer-motion"
import {
  LayoutDashboard, Users, CreditCard, Activity,
  Calendar, Settings, Heart
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
      {/* Sidebar — icon rail */}
      <aside className="w-14 shrink-0 flex flex-col border-r border-[var(--surface-border)]">
        {/* Logo mark */}
        <div className="flex items-center justify-center h-14 border-b border-[var(--surface-border)]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--teal), var(--teal-dark))",
              boxShadow: "var(--shadow-teal-glow)",
            }}
          >
            <Heart className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Nav icons */}
        <nav className="flex-1 flex flex-col items-center gap-1 py-3">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  active
                    ? "bg-[rgba(43,168,162,0.15)] text-[var(--teal-light)] shadow-[inset_3px_0_0_var(--teal)]"
                    : "text-[var(--text-muted)] hover:bg-[rgba(43,168,162,0.08)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon className="w-4 h-4" />
              </Link>
            )
          })}
        </nav>

        {/* User button */}
        <div className="flex items-center justify-center h-14 border-t border-[var(--surface-border)]">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 ring-1 ring-[var(--teal)] ring-offset-1 ring-offset-[var(--surface-base)]",
              },
            }}
          />
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

      <Paige />
    </div>
  )
}
