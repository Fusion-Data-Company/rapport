# Rapport Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken Rapport dashboard — icon sidebar, KPI hierarchy, empty states with CTAs, working card gallery upload/delete, and a fully-seeded McKay 66 test contact.

**Architecture:** Surgical edits to two existing files (AppShell, dashboard page), three new API route files, and a public uploads directory. No schema changes. No new dependencies.

**Tech Stack:** Next.js 16.2.6 (Turbopack), Clerk v7, Drizzle ORM + Neon, React Query, Framer Motion, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/layout/AppShell.tsx` | Modify | Collapse sidebar to 56px icon rail |
| `src/app/(app)/dashboard/page.tsx` | Modify | KPI accent bars, empty state CTAs, header button, dev seed trigger |
| `src/app/api/cards/upload/route.ts` | Create | Accept multipart upload, write to disk, insert card_templates row |
| `src/app/api/cards/[id]/route.ts` | Create | DELETE card by id (tenant-scoped, blocks isSystem) |
| `src/app/api/dev/seed/route.ts` | Create | Insert fully-populated test contact + children + sports team + scheduled send |
| `public/uploads/cards/.gitkeep` | Create | Ensure upload dir exists in repo |
| `.gitignore` | Modify | Exclude `public/uploads/` from git |

---

## Task 1: Icon-Only Sidebar

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Replace full sidebar with icon rail**

Replace the entire file content with:

```tsx
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
      {/* Sidebar — icon rail only */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: collapse sidebar to 56px icon rail"
```

---

## Task 2: Dashboard — KPI Fixes, Empty States, Header CTA, Dev Seed Button

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard page with fully fixed version**

Replace the entire file with:

```tsx
"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassButton } from "@/components/ui/glass-button"
import {
  Mail, Users, TrendingUp, Activity,
  CheckCircle, Calendar, Plus, Sprout
} from "lucide-react"

const STAGGER = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }
const CONTAINER = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const ACCENT: Record<string, string> = {
  teal:  "var(--teal)",
  gold:  "var(--gold)",
  sky:   "var(--sky)",
  coral: "var(--coral)",
}

function StatCard({
  icon: Icon, label, value, sub, color = "teal",
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const accent = ACCENT[color] ?? "var(--teal)"
  return (
    <motion.div variants={STAGGER} className="min-w-0">
      <GlassCard
        className="p-5 h-full overflow-hidden"
        style={{ borderTop: `3px solid ${accent}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-muted)]">
              {label}
            </p>
            <p className="text-2xl font-bold text-white tabular-nums truncate">{value}</p>
            {sub && (
              <p className="text-xs mt-1 text-[var(--text-muted)] truncate">{sub}</p>
            )}
          </div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `rgba(${
              color === "teal"  ? "43,168,162" :
              color === "coral" ? "239,108,74" :
              color === "gold"  ? "255,210,63" :
              "93,173,226"
            },0.15)` }}
          >
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

export default function DashboardPage() {
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/analytics/stats").then(r => r.json()),
  })

  const { data: todaySends = [] } = useQuery({
    queryKey: ["today-sends"],
    queryFn: () => fetch("/api/schedule/today").then(r => r.json()),
  })

  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming"],
    queryFn: () => fetch("/api/schedule/upcoming").then(r => r.json()),
  })

  const seedMutation = useMutation({
    mutationFn: () => fetch("/api/dev/seed", { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })

  const s = stats ?? {}
  const isDev = process.env.NODE_ENV !== "production"

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-h1 text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDev && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => seedMutation.mutate()}
              loading={seedMutation.isPending}
              title="Insert a fully-populated test contact (dev only)"
            >
              <Sprout className="w-3.5 h-3.5" />
              Load test data
            </GlassButton>
          )}
          <Link href="/contacts">
            <GlassButton size="sm">
              <Plus className="w-3.5 h-3.5" />
              Add Contact
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <motion.div
        variants={CONTAINER}
        initial="hidden"
        animate="show"
        className="grid grid-cols-4 gap-4"
      >
        <StatCard
          icon={Mail}
          label="Sent This Month"
          value={s.sentThisMonth ?? 0}
          sub="email cards delivered"
          color="teal"
        />
        <StatCard
          icon={TrendingUp}
          label="Open Rate"
          value={s.openRate ? `${s.openRate}%` : "—"}
          sub="vs 21% industry avg"
          color="gold"
        />
        <StatCard
          icon={Users}
          label="Contacts"
          value={s.totalContacts ?? 0}
          sub="active in database"
          color="sky"
        />
        <StatCard
          icon={Activity}
          label="Sports Alerts"
          value={s.sportsAlerts ?? 0}
          sub="this month"
          color="coral"
        />
      </motion.div>

      {/* Content row */}
      <div className="grid grid-cols-3 gap-5 items-stretch">
        {/* Going Out Today — 2/3 width */}
        <GlassCard className="col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
            <h3 className="font-bold text-white">Going Out Today</h3>
            <span className="badge badge-teal ml-auto">{todaySends.length}</span>
          </div>

          {todaySends.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-[var(--text-muted)]">
              <CheckCircle className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">All clear for today</p>
              <Link href="/schedule">
                <GlassButton variant="ghost" size="sm">
                  View Schedule →
                </GlassButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySends.slice(0, 8).map((send: any) => (
                <div
                  key={send.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--teal-dark)] to-[var(--teal)] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {send.contactFirstName?.[0]}{send.contactLastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {send.contactFirstName} {send.contactLastName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{send.occasionLabel}</p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      send.status === "sent"   ? "bg-[var(--success)]" :
                      send.status === "failed" ? "bg-[var(--error)]"   :
                      "bg-[var(--gold)]"
                    }`}
                    title={send.status}
                  />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Coming Up — 1/3 width */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[var(--gold)]" />
            <h3 className="font-bold text-white text-sm">Coming Up</h3>
            {upcoming.length > 0 && (
              <span className="badge badge-gold ml-auto">{upcoming.length}</span>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-[var(--text-muted)]">
              <Calendar className="w-7 h-7 opacity-30" />
              <p className="text-xs text-center leading-relaxed">
                No upcoming occasions yet
              </p>
              <Link href="/contacts/import">
                <GlassButton variant="ghost" size="sm">
                  Import Contacts →
                </GlassButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {upcoming.slice(0, 10).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 border-b border-[var(--surface-border)] last:border-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-900/60 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold uppercase text-[var(--teal)]">
                      {new Date(item.scheduledDate).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-sm font-bold text-white leading-none">
                      {new Date(item.scheduledDate).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {item.contactFirstName} {item.contactLastName}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {item.occasionLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: fix dashboard KPI hierarchy, empty states, header CTA, dev seed button"
```

---

## Task 3: Card Upload API Route

**Files:**
- Create: `src/app/api/cards/upload/route.ts`

- [ ] **Step 1: Create upload route**

```typescript
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, cardTemplates, tenantUsers } from "@/lib/db"
import { eq } from "drizzle-orm"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

async function getTenantId(userId: string) {
  const u = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  return u?.tenantId ?? null
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const occasionType = formData.get("occasionType") as string | null

    if (!file || !occasionType) {
      return NextResponse.json({ error: "Missing file or occasionType" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads", "cards")

    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)

    const imageUrl = `/uploads/cards/${filename}`
    const name = file.name.replace(/\.[^.]+$/, "")

    const [card] = await db
      .insert(cardTemplates)
      .values({ tenantId, occasionType, name, imageUrl, isSystem: false, isActive: true })
      .returning()

    return NextResponse.json(card, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cards/upload/route.ts
git commit -m "feat: add card image upload API route"
```

---

## Task 4: Card Delete API Route

**Files:**
- Create: `src/app/api/cards/[id]/route.ts`

- [ ] **Step 1: Create DELETE route**

Note: Next.js 16 dynamic route params are a `Promise` — must `await params`.

```typescript
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, cardTemplates, tenantUsers } from "@/lib/db"
import { eq, and } from "drizzle-orm"

async function getTenantId(userId: string) {
  const u = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  return u?.tenantId ?? null
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    const { id } = await params

    const card = await db.query.cardTemplates.findFirst({
      where: and(eq(cardTemplates.id, id), eq(cardTemplates.tenantId, tenantId)),
    })

    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (card.isSystem) return NextResponse.json({ error: "Cannot delete system cards" }, { status: 403 })

    await db
      .delete(cardTemplates)
      .where(and(eq(cardTemplates.id, id), eq(cardTemplates.tenantId, tenantId)))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cards/[id]/route.ts
git commit -m "feat: add card delete API route"
```

---

## Task 5: Dev Seed Route — Full McKay 66 Test Contact

**Files:**
- Create: `src/app/api/dev/seed/route.ts`

- [ ] **Step 1: Create seed route**

```typescript
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  db, contacts, contactChildren, contactSportsTeams,
  scheduledSends, tenantUsers,
} from "@/lib/db"
import { eq, and } from "drizzle-orm"

async function getTenantId(userId: string) {
  const u = await db.query.tenantUsers.findFirst({ where: eq(tenantUsers.clerkUserId, userId) })
  return u?.tenantId ?? null
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const tenantId = await getTenantId(userId)
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 })

    // Idempotent — remove existing test contact by email
    await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          eq(contacts.email, "alex.testfield@example.com"),
        )
      )

    // Tomorrow's date string for birthday scheduled send
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]

    const [contact] = await db
      .insert(contacts)
      .values({
        tenantId,
        firstName: "Alex",
        lastName: "Testfield",
        nickname: "Al",
        email: "alex.testfield@example.com",
        phone: "(555) 867-5309",
        birthdate: "1981-05-08",
        birthdateYearUnknown: false,
        placeHometown: "Austin, TX",
        height: "6'1\"",
        weight: "185 lbs",
        spouseName: "Jordan Testfield",
        spouseOccupation: "Architect",
        spouseEducation: "M.Arch, UT Austin",
        spouseInterests: "Interior design, hiking",
        anniversary: "2008-06-14",
        highSchool: "McCallum High School",
        highSchoolGradYear: 1999,
        college: "University of Texas",
        collegeGradYear: 2003,
        collegeHonors: "Cum Laude",
        degrees: "B.S. Business Administration",
        collegeFraternity: "Sigma Chi",
        collegeSports: "Intramural basketball",
        collegeActivities: "Student government, debate",
        militaryService: "None",
        companyName: "Testfield Ventures LLC",
        companyAddress: "1234 Congress Ave",
        city: "Austin",
        state: "TX",
        zip: "78701",
        country: "US",
        businessPhone: "(512) 555-0192",
        jobTitle: "Managing Partner",
        previousEmployer1: "Dell Technologies",
        previousEmployer2: "Accenture",
        statusSymbols: "Tesla Model S, lake house",
        professionalAssociations: "Austin Chamber of Commerce",
        officesHeld: "Board Member, Austin Tech Council",
        businessObjectiveLongRange: "Build and exit a SaaS company by 2030",
        businessObjectiveImmediate: "Close Series A by Q3",
        greatestConcern: "Talent retention",
        presentOrFuture: "Future-oriented",
        clubs: "Austin Country Club, Rotary",
        politicallyActive: false,
        communityActive: "Big Brothers Big Sisters volunteer",
        religion: "Catholic",
        religionActive: true,
        sensitiveTopics: "Divorce (first marriage)",
        strongFeelings: "Strong on border policy",
        drinks: true,
        drinkType: "Scotch, IPA beer",
        smokes: false,
        favoriteLunchRestaurant: "Uchi",
        favoriteDinnerRestaurant: "Fogo de Chão",
        favoriteMenuItems: "Wagyu, old fashioned",
        hobbies: "Golf, woodworking, fly fishing",
        vacationHabits: "Annual ski trip to Telluride, Caribbean summer",
        carType: "Tesla Model S, '68 Mustang (weekend)",
        conversationalInterests: "Tech startups, UT football, fishing",
        adjectives: "Driven, generous, competitive",
        proudestAchievement: "Sold first company at 34",
        personalObjectiveLongRange: "Semi-retire by 55",
        personalObjectiveImmediate: "Spend more time with kids",
        moralConsiderations: "Highly ethical in business",
        highlyEthical: true,
        keyProblems: "Work-life balance, too many meetings",
        facebookUrl: "https://facebook.com/alex.testfield",
        linkedinUrl: "https://linkedin.com/in/alex-testfield",
        instagramUrl: "https://instagram.com/altestfield",
        internalNotes:
          "Met at Austin Chamber mixer March 2026. Refer to spouse as Jordan, not \"wife.\" Remembers everything — prep well.",
        tags: ["vip", "prospect", "golfer"],
        source: "manual",
        enrichmentScore: 82,
        status: "active",
      })
      .returning()

    // Children (cascade-deletes with contact)
    await db.insert(contactChildren).values([
      {
        contactId: contact.id,
        tenantId,
        name: "Emma Testfield",
        birthdate: "2010-03-22",
        birthdateYearUnknown: false,
        school: "Westlake High School",
        interests: "Soccer, art",
      },
      {
        contactId: contact.id,
        tenantId,
        name: "Liam Testfield",
        birthdate: "2013-11-05",
        birthdateYearUnknown: false,
        school: "Hill Country Middle School",
        interests: "Minecraft, baseball",
      },
    ])

    // Sports team
    await db.insert(contactSportsTeams).values({
      contactId: contact.id,
      tenantId,
      sport: "Football",
      teamName: "Dallas Cowboys",
      teamId: "dal",
      league: "NFL",
      level: "pro",
    })

    // Upcoming birthday scheduled send (tomorrow so it shows in dashboard)
    await db.insert(scheduledSends).values({
      tenantId,
      contactId: contact.id,
      occasionType: "birthday",
      occasionLabel: "🎂 Birthday",
      scheduledDate: tomorrowStr,
      status: "pending",
      emailSubject: "Happy Birthday, Alex!",
    })

    return NextResponse.json({ success: true, contactId: contact.id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/dev/seed/route.ts
git commit -m "feat: add dev seed route with full McKay 66 test contact"
```

---

## Task 6: Upload Directory + .gitignore

**Files:**
- Create: `public/uploads/cards/.gitkeep`
- Modify: `.gitignore`

- [ ] **Step 1: Create upload directory marker**

```bash
mkdir -p public/uploads/cards
touch public/uploads/cards/.gitkeep
```

- [ ] **Step 2: Add uploads to .gitignore**

Append to `.gitignore`:
```
public/uploads/
!public/uploads/cards/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add public/uploads/cards/.gitkeep .gitignore
git commit -m "chore: add public/uploads dir and exclude from git"
```
