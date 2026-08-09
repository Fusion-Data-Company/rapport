@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Next.js 16.2** (App Router) on **React 19.2** — APIs, file conventions, and routing have breaking changes vs. older versions. Before writing routing/middleware/server-component code, read the relevant guide under `node_modules/next/dist/docs/`. Heed deprecation notices.
- **TypeScript** strict, path alias `@/*` → `src/*`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`.
- **Drizzle ORM** + **Neon serverless Postgres** (`@neondatabase/serverless`).
- **Clerk** for auth (multi-tenant; Clerk user → tenant mapping in DB).
- **Resend** for email, **@vercel/blob** for asset storage, **OpenAI SDK** as LLM client (multi-provider).
- **TanStack Query** for client-side data fetching, **TanStack Table** for the contacts grid, **framer-motion** for animation, **Radix UI** primitives.

## Commands

```bash
npm run dev      # next dev — local server on :3000
npm run build    # next build
npm run start    # next start (production)
npm run lint     # eslint (flat config in eslint.config.mjs)

# Drizzle (no npm script wrappers — call drizzle-kit directly)
npx drizzle-kit generate   # generate migration SQL into ./drizzle from src/lib/db/schema.ts
npx drizzle-kit push       # push schema to DATABASE_URL (Neon)
npx drizzle-kit studio     # open Drizzle Studio
```

There are **no tests** configured in this repo. Don't fabricate `npm test` instructions.

## Required environment variables

- `DATABASE_URL` — Neon Postgres connection string (used by both runtime and `drizzle.config.ts`).
- `CLERK_*` / `NEXT_PUBLIC_CLERK_*` — Clerk auth (sign-in/up routes are wired to `/sign-in`, `/sign-up`, post-sign-up redirect to `/onboarding`).
- `CRON_SECRET` — Bearer token expected by `/api/cron/*` routes; Vercel Cron sends this automatically.
- `OPENROUTER_API_KEY` — fallback LLM key when a tenant has no `tenantLlmConfig` row.
- `RESEND_API_KEY` — fallback email key when a tenant has no `tenantEmailConfig` row.
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` — optional; if unset, the Paige voice widget is hidden.

## Architecture

### Multi-tenancy

Every domain table has a `tenantId` FK. `tenantUsers` maps a Clerk `userId` to a `tenantId` (one tenant per Clerk user, enforced by a unique index on `clerk_user_id`). The standard server-side pattern is:

```ts
const { userId } = await auth()
const tenantId = (await db.query.tenantUsers.findFirst({
  where: eq(tenantUsers.clerkUserId, userId),
}))?.tenantId
```

This `getTenantId` helper is duplicated in most API routes (e.g. `src/app/api/contacts/route.ts`). **Always scope queries and mutations by `tenantId`** — there is no row-level security in the DB. New API routes must enforce this manually.

### Routing layout

App Router with route groups:
- `src/app/(marketing)/` — public landing page (`/`, `/pricing`).
- `src/app/(app)/` — authenticated app shell. `(app)/layout.tsx` checks Clerk auth, then verifies a `tenantUsers` row exists and redirects to `/onboarding` if not. Pages under here render inside `AppShell` (sidebar + main area + Paige widget).
- `src/app/onboarding/page.tsx` — separate from `(app)` because users arrive here without a tenant.
- `src/app/sign-in/[[...sign-in]]/`, `src/app/sign-up/[[...sign-up]]/` — Clerk catch-all routes.
- `src/app/api/` — REST endpoints. CRON endpoints under `api/cron/*` use `Bearer ${process.env.CRON_SECRET}` auth and `runtime = "nodejs"`, `maxDuration = 300`.

### Middleware lives at `src/proxy.ts`, NOT `middleware.ts`

Next.js 16 renamed the middleware file. The Clerk middleware here defines public routes (`/`, `/pricing`, `/sign-in*`, `/sign-up*`, `/onboarding*`, `/api/webhooks*`, `/api/cron*`, `/api/unsubscribe*`, `/api/onboarding*`) and protects everything else. Signed-in users hitting marketing pages are redirected to `/dashboard`. When adding a new public endpoint, add it to `isPublicRoute` in `src/proxy.ts`.

### Database (`src/lib/db/`)

`schema.ts` is the single source of truth for all tables and `drizzle-kit` commands consume it via `drizzle.config.ts`. `index.ts` exports a configured `db` plus everything from `schema`, so import like:

```ts
import { db, contacts, tenants, tenantUsers } from "@/lib/db"
```

Domain model highlights:
- `contacts` carries the **Harvey Mackay 66** profile fields (~80 columns covering identity, family, education, military, business, lifestyle, personality, social URLs, geocoding). Children are a separate `contactChildren` table; sports allegiances are `contactSportsTeams`.
- `cardTemplates` are either system-wide (`tenantId IS NULL`, `isSystem = true`) or tenant-owned, keyed by `occasionType` (e.g. `birthday`, `anniversary`, `child_birthday`, `sports_win`, `sports_loss`).
- `scheduledSends` is the queue/log: rows are inserted by the sports cron and the daily cron, `status` transitions `pending` → `sent` / `failed`.
- `tenantEmailConfig`, `tenantLlmConfig`, `tenantAgentConfig` hold per-tenant provider settings. Note: API key columns are named `*_encrypted` but values are currently stored verbatim — treat encryption as a TODO when touching this code.

### Cron jobs (defined in `vercel.json`)

- `/api/cron/daily-sends` at `0 14 * * *` (UTC) — finds contacts whose `birthdate` or `anniversary` MM-DD matches today, finds child birthdays, and processes any `scheduledSends` already queued for today (typically by the sports cron). For each, it fetches the tenant's LLM config, generates a personalized subject/body via `generateEmailContent`, picks an active card template, and sends through Resend with an inlined HTML wrapper.
- `/api/cron/sports-monitor` at `0 16,22,4 * * *` (UTC) — pulls completed games from ESPN's public scoreboard JSON across 7 leagues (NFL, NBA, MLB, NHL, MLS, CFB, CBB), upserts into `sportsEvents`, finds fans via `contactSportsTeams.teamId`, rate-limits to 1 sports email per contact per 7 days (`sportsNotificationsSent`), and queues a `scheduledSends` row for tomorrow that the daily cron will mail out.

When adding a new cron, add the route under `src/app/api/cron/`, register it in `vercel.json`, and gate with the `CRON_SECRET` bearer check at the top of the handler.

### LLM layer (`src/lib/llm/index.ts`)

A single `generateEmailContent(opts)` function powers all generated email copy. It uses the OpenAI SDK with a swappable `baseURL` to talk to OpenRouter / Anthropic / OpenAI / Google. Provider/model/key come from the tenant's `tenantLlmConfig`, falling back to env vars and OpenRouter defaults. The prompt enforces a strict `SUBJECT:` / `BODY:` format that the function parses; if parsing fails, it falls back to a generic subject and the raw text. Keep edits to the prompt small and preserve that format.

### Frontend conventions

- Design tokens live in `src/app/globals.css` as CSS custom properties (`--teal`, `--coral`, `--gold`, `--surface-*`, `--shadow-*`, `--radius-*`). Tailwind colors in `tailwind.config.ts` mirror these. **Use the CSS variables or the named Tailwind colors** (`teal`, `coral`, `gold`, `cream`, `sky`) rather than hand-coded hex.
- Reusable utility classes (also in `globals.css`): `.glass-card`, `.neon-card`, `.btn-primary`/`.btn-gold`/`.btn-coral`/`.btn-ghost`, `.input-premium`, `.badge-*`, `.rapport-table`, `.nav-item`, `.card-accent-*`. Prefer composing these over reinventing.
- Headlines use Playfair Display; body uses Inter; mono uses JetBrains Mono. Three custom animations: `glow-pulse`, `fade-in`, `slide-in-right`.
- Wrapper components in `src/components/ui/` (`GlassCard`, `GlassButton`, `GlassInput`, `social-icons`) layer framer-motion + the CSS classes. Prefer them in app pages.
- Client data fetching uses TanStack Query (`Providers` in `src/app/providers.tsx` sets `staleTime: 30s`, `retry: 1`). Query keys are conventionally a tuple starting with the resource (e.g. `["contacts"]`).
- The contacts grid (`src/components/contacts/ContactsTable.tsx`) and slide-out (`ContactSlidePanel.tsx`) are large; the parent page passes `onUpdate(id, field, value)` and `onDelete(id)` callbacks that hit `/api/contacts/[id]`.
- `src/components/Paige.tsx` injects the ElevenLabs `<elevenlabs-convai>` web component — it's mounted globally inside `AppShell`. Keep the dynamic script-injection pattern; declaring the custom element as a typed JSX intrinsic doesn't play nicely with React 19 typings.

### CSV import flow

`src/app/(app)/contacts/import/page.tsx` parses CSV/Excel client-side with PapaParse, auto-maps headers via `FIELD_MAP`, lets the user override mappings, then POSTs to `/api/contacts/bulk` in batches of 50. The bulk endpoint also handles a single `name` column by splitting on whitespace.
