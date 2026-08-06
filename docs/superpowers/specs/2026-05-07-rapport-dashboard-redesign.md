# Rapport Dashboard — Full Fix & Redesign

**Date:** 2026-05-07  
**Status:** Approved  
**Branch:** claude/epic-dewdney-8a463f

---

## Problem Summary

The Rapport dashboard has multiple broken areas: KPI cards overflow/clip at standard browser widths, empty states have no actionable CTAs, the Card Gallery upload silently fails due to a missing API route, there are no working action buttons anywhere on the dashboard, and there is no test data to develop against.

---

## Scope

This spec covers four areas:

1. **App shell** — icon-only sidebar (Option A layout)
2. **Dashboard page** — KPI hierarchy, section layout, empty states, action buttons
3. **Card Gallery** — missing upload and delete API routes
4. **Seed contact** — one fully-populated McKay 66 contact for development

---

## 1. App Shell — Icon Sidebar

### Current
Sidebar is 224px (`w-56`) with text labels. On narrower viewports the sidebar + KPI 4-col grid overflow and clip content.

### New
Sidebar shrinks to 56px (`w-14`), icons only. No text labels in the rail.

**Changes to `src/components/layout/AppShell.tsx`:**
- Remove `<span>{label}</span>` from nav items
- Remove `<ChevronRight>` from active items
- Remove the logo subtitle ("CRM")
- Add `title={label}` to each nav item for browser tooltip
- Adjust logo area: mark only, no text
- Remove "My Account / Starter Plan" text block; keep `<UserButton>` centered at bottom
- Width: `w-14` (56px)

**Active state:** left-edge accent bar (`box-shadow: inset 3px 0 0 var(--teal)`) + teal icon color. Already in CSS `.nav-item.active` — no CSS change needed, just the width reduction.

---

## 2. Dashboard Page

### 2a. Page Header

**File:** `src/app/(app)/dashboard/page.tsx`

Add a "+ Add Contact" button (`btn-primary` class, routes to `/contacts`) in the top-right of the header row alongside the date.

### 2b. KPI Cards

**Current problem:** `grid-cols-4` with no overflow protection clips on viewports narrower than ~1100px.

**Fix:**
- Add `min-w-0` to each `<motion.div>` wrapper in the grid
- Add `overflow: hidden` to `GlassCard` inside `StatCard`
- Add a 3px color accent bar across the top of each KPI card (teal/gold/sky/coral) using `border-top`
- Change value font size from `text-3xl` to `text-2xl` to give labels more room
- KPI label stays all-caps tracking-widest but bumps from `text-[11px]` to `text-xs` for legibility

The 4-column layout is preserved — no 2×2 change needed because the icon sidebar gives back ~168px of horizontal space.

### 2c. Section Layout

**Current problem:** "Going Out Today" and "Coming Up" render at mismatched heights because the grid container has no explicit height.

**Fix:** The `grid grid-cols-3` wrapper gets `items-stretch` — both panels fill the same row height automatically.

### 2d. Empty States

**Going Out Today (empty):**
```
[CheckCircle icon]
All clear for today
[View Schedule →] (button, routes to /schedule)
```

**Coming Up (empty):**
```
[Calendar icon]
No upcoming occasions
[Import Contacts →] (button, routes to /contacts/import)
```

Both use `flex flex-col items-center gap-3 py-10` with a `GlassButton` component instead of dead text.

---

## 3. Card Gallery — Missing API Routes

### 3a. Upload Route

**Create:** `src/app/api/cards/upload/route.ts`

- Method: `POST`
- Content-Type: `multipart/form-data`
- Fields: `file` (image), `occasionType` (string)
- Auth: Clerk `auth()`, tenant lookup
- Storage: write file to `public/uploads/cards/<uuid>.<ext>` and return the public URL
  - Production path: swap to Vercel Blob when `BLOB_READ_WRITE_TOKEN` env var is present
- DB: insert into `card_templates` with `tenantId`, `occasionType`, `name` (filename without ext), `imageUrl`, `isSystem: false`
- Returns: the created `card_templates` row as JSON

### 3b. Delete Route

**Create:** `src/app/api/cards/[id]/route.ts`

- Method: `DELETE`
- Auth: Clerk + tenant check (only delete own tenant's cards, block `isSystem: true`)
- DB: delete from `card_templates` where `id = params.id AND tenantId = tenantId AND isSystem = false`
- Returns: `{ success: true }`

### 3c. Storage Directory

Add `public/uploads/cards/.gitkeep` so the directory exists in the repo. Add `public/uploads/` to `.gitignore` to avoid committing uploaded images.

---

## 4. Seed Contact

### 4a. API Route

**Create:** `src/app/api/dev/seed/route.ts`

- Method: `POST`
- Guard: return `403` if `process.env.NODE_ENV === 'production'`
- Auth: Clerk + tenant lookup
- Idempotent: delete existing contact with `firstName = 'Alex'` and `lastName = 'Testfield'` before inserting

**Inserts:**
1. One `contacts` row with all 66 McKay fields populated (see data below)
2. Two `contact_children` rows
3. One `contact_sports_teams` row
4. One `scheduled_sends` row with `scheduledDate = tomorrow`, `occasionType = 'birthday'`, `status = 'pending'`

**Test contact data (Alex Testfield):**

| Field | Value |
|-------|-------|
| firstName | Alex |
| lastName | Testfield |
| nickname | Al |
| email | alex.testfield@example.com |
| phone | (555) 867-5309 |
| birthdate | 1981-05-08 (tomorrow) |
| placeHometown | Austin, TX |
| height | 6'1" |
| weight | 185 lbs |
| spouseName | Jordan Testfield |
| spouseOccupation | Architect |
| spouseEducation | M.Arch, UT Austin |
| spouseInterests | Interior design, hiking |
| anniversary | 2008-06-14 |
| highSchool | McCallum High School |
| highSchoolGradYear | 1999 |
| college | University of Texas |
| collegeGradYear | 2003 |
| collegeHonors | Cum Laude |
| degrees | B.S. Business Administration |
| collegeFraternity | Sigma Chi |
| collegeSports | Intramural basketball |
| collegeActivities | Student government, debate |
| militaryService | None |
| companyName | Testfield Ventures LLC |
| companyAddress | 1234 Congress Ave |
| city | Austin |
| state | TX |
| zip | 78701 |
| country | US |
| businessPhone | (512) 555-0192 |
| jobTitle | Managing Partner |
| previousEmployer1 | Dell Technologies |
| previousEmployer2 | Accenture |
| statusSymbols | Tesla Model S, lake house |
| professionalAssociations | Austin Chamber of Commerce |
| officesHeld | Board Member, Austin Tech Council |
| businessObjectiveLongRange | Build and exit a SaaS company by 2030 |
| businessObjectiveImmediate | Close Series A by Q3 |
| greatestConcern | Talent retention |
| presentOrFuture | Future-oriented |
| clubs | Austin Country Club, Rotary |
| politicallyActive | false |
| communityActive | Big Brothers Big Sisters volunteer |
| religion | Catholic |
| religionActive | true |
| sensitiveTopics | Divorce (first marriage) |
| strongFeelings | Strong on border policy |
| drinks | true |
| drinkType | Scotch, IPA beer |
| smokes | false |
| favoriteLunchRestaurant | Uchi |
| favoriteDinnerRestaurant | Fogo de Chão |
| favoriteMenuItems | Wagyu, old fashioned |
| hobbies | Golf, woodworking, fly fishing |
| vacationHabits | Annual ski trip to Telluride, Caribbean summer |
| carType | Tesla Model S, '68 Mustang (weekend) |
| conversationalInterests | Tech startups, UT football, fishing |
| adjectives | Driven, generous, competitive |
| proudestAchievement | Sold first company at 34 |
| personalObjectiveLongRange | Semi-retire by 55 |
| personalObjectiveImmediate | Spend more time with kids |
| moralConsiderations | Highly ethical in business |
| highlyEthical | true |
| keyProblems | Work-life balance, too many meetings |
| facebookUrl | https://facebook.com/alex.testfield |
| linkedinUrl | https://linkedin.com/in/alex-testfield |
| instagramUrl | https://instagram.com/altestfield |
| internalNotes | Met at Austin Chamber mixer March 2026. Refer to spouse as Jordan, not "wife." Remembers everything — prep well. |
| tags | ['vip', 'prospect', 'golfer'] |
| source | manual |
| enrichmentScore | 82 |

**Children:**
1. Emma Testfield, born 2010-03-22, school: Westlake High, interests: soccer, art
2. Liam Testfield, born 2013-11-05, school: Hill Country Middle, interests: Minecraft, baseball

**Sports team:** NFL / Dallas Cowboys (teamId: dal), level: pro

**Scheduled send:** birthday card for tomorrow (2026-05-08), status: pending

### 4b. Dashboard Trigger

Add a "Load test data" button to the dashboard — visible only when `process.env.NODE_ENV !== 'production'` (pass as a server component prop or use a `NEXT_PUBLIC_DEV_MODE` env var). Button calls `POST /api/dev/seed` and invalidates all queries on success.

---

## File Checklist

| File | Action |
|------|--------|
| `src/components/layout/AppShell.tsx` | Modify — icon-only sidebar |
| `src/app/(app)/dashboard/page.tsx` | Modify — header CTA, KPI fixes, empty states |
| `src/app/api/cards/upload/route.ts` | Create |
| `src/app/api/cards/[id]/route.ts` | Create |
| `src/app/api/dev/seed/route.ts` | Create |
| `public/uploads/cards/.gitkeep` | Create |
| `.gitignore` | Modify — add `public/uploads/` |

---

## Out of Scope

- Contacts table column changes (separate task)
- Email sending integration
- Vercel Blob wiring (upload falls back to local filesystem; swap is additive)
- Settings page
- Onboarding flow changes
