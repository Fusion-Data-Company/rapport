# Rapport

**Relationship autopilot for people whose income depends on a book of clients.**

Rapport keeps a rich personal profile on every contact a rep cares about, watches the calendar
(birthdays, work anniversaries, renewals, their team's game results), writes the note the rep never
has time to write, and sends it from the rep's own mailbox. Sales reps, account managers, agents,
loan officers, recruiters.

Demo: https://rapport-demo-ruby.vercel.app (fictional sample book, own database) · Buyers get their own instance, see `docs/PROVISION.md` · $29 per seat per month · 14-day trial · 250 contacts per seat

## How it works

1. Sign up (Clerk), create your workspace, upload contacts (CSV, business-card photo, or by hand).
2. Connect the mailbox the notes should come from: **Settings → Email Provider** (Google Workspace,
   Microsoft 365, or any SMTP; verified before it saves, with a test send).
3. Every morning the daily cron finds the milestones and sports results due today, writes each note
   with the configured LLM, and sends it. Every email carries a one-click unsubscribe link.
4. Billing is per seat through Stripe Checkout; the customer portal handles upgrades and cancellation.

## Stack

Next.js (App Router) · Clerk · Neon Postgres + Drizzle · Stripe · OpenRouter (bring your own key
optional) · nodemailer behind a `MailDriver` interface (`src/lib/mailer.ts`).

## Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | yes | Clerk app |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | yes | per-seat price, webhook → `/api/stripe/webhook` |
| `NEXT_PUBLIC_APP_URL` | yes | canonical URL (redirects, unsubscribe links) |
| `UNSUBSCRIBE_SECRET`, `CRON_SECRET` | yes | signing secrets |
| `OPENROUTER_API_KEY` | yes | default LLM; tenants may bring their own |
| `SMTP_URL` | optional | platform fallback mailbox for trials that have not connected one |

## Run locally

```bash
npm install
cp .env.example .env.local   # fill the table above
npx drizzle-kit push          # or apply drizzle/*.sql
npm run dev
```

## Mail drivers

`src/lib/mailer.ts` resolves, per tenant: the tenant's own SMTP mailbox → the platform `SMTP_URL`
→ a refusing no-op (the send is marked failed, never faked). Add a vendor by implementing
`MailDriver` and returning it from `resolveDriver`. Nothing else in the app knows how mail moves.

## Licence

Proprietary. © Fusion Data Company.
