# Rapport

**The renewal, the closing anniversary and the birthday, remembered for you, and sent
from your own mailbox.**

Rapport is for the solo insurance agent and the solo loan officer whose income is a
book of clients and who is never going to pay $349 a month for Levitate. It keeps the
dates that pay - policy renewal, loan and home anniversaries, the check-in a few months
after a file closes - alongside the human ones, writes each note from what has actually
happened with that person, and sends it through the agent's own Gmail or Microsoft 365
mailbox so it lands in the inbox and reads like they wrote it.

Demo: https://rapport-demo-ruby.vercel.app (fictional sample book, own database) ·
Buyers get their own instance, see `docs/PROVISION.md` · $39/month up to 1,000
contacts, $79 up to 5,000 · 14-day trial, no card.

## How it works

1. Sign up, create the workspace, load the book: CSV from HawkSoft, EZLynx, Follow Up
   Boss or a spreadsheet, an inbound webhook, or by hand.
2. Connect the mailbox under **Settings, Sending mailbox**. One click for Google
   Workspace or Microsoft 365 on a send-only OAuth grant; SMTP for anything else. The
   same page shows the daily send cap, the warm-up ramp, and an SPF, DKIM and DMARC
   check for the sending domain.
3. Every morning the cron finds what is due, drafts each note from the contact's
   interaction history, and holds it on **Today** for a read. Approve, edit in place,
   skip, or approve the lot; approving sends immediately.
4. Turn "always review before send" off and it runs itself.

## What it watches

| Occasion | When it fires |
|---|---|
| Policy renewal | A configurable lead time before the renewal date, 30 days by default |
| Loan anniversary | The closing date, from year one |
| Home anniversary | The purchase date, from year one |
| Months since close | Configurable months after closing, 3 / 6 / 12 by default |
| Birthday, wedding anniversary, a child's birthday | On the day |
| Custom dates | Any date per contact, annually or once |
| Their team won or lost | The morning after, from the ESPN scoreboard |

Contacts carry a tier. A is the inner circle and hears about everything; B is the
working book; C is the long tail. The tier sets the fewest days between notes to one
person, so the long tail is not written to every month.

## Stack

Next.js 16 (App Router) · Clerk · Neon Postgres + Drizzle · Stripe · OpenRouter (bring
your own key optional) · Gmail API, Microsoft Graph and nodemailer behind one
`MailDriver` interface (`src/lib/mailer.ts`).

## Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon connection string |
| `ENCRYPTION_KEY` | yes | 32 bytes, base64 or hex. Seals SMTP passwords, OAuth refresh tokens and LLM keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | yes | Clerk app |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | yes | per-seat price, webhook to `/api/stripe/webhook` |
| `NEXT_PUBLIC_APP_URL` | yes | canonical URL (OAuth redirects, unsubscribe links, inbound URL) |
| `UNSUBSCRIBE_SECRET`, `CRON_SECRET` | yes | signing secrets |
| `OPENROUTER_API_KEY` | yes | default LLM; tenants may bring their own |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | optional | one-click Gmail sending. Redirect: `<APP_URL>/api/oauth/google/callback` |
| `MS_OAUTH_CLIENT_ID`, `MS_OAUTH_CLIENT_SECRET` | optional | one-click Microsoft 365 sending. Redirect: `<APP_URL>/api/oauth/microsoft/callback` |
| `SMTP_URL` | optional | platform fallback mailbox for trials that have not connected one |
| `BLOB_READ_WRITE_TOKEN` | optional | card image uploads |

Unset OAuth credentials are not an error: the buttons say the provider is not enabled
on this deployment and SMTP carries the load.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill the table above
npx drizzle-kit push          # or apply drizzle/*.sql in order
npm run dev
```

`src/lib/db/ensure.ts` is the runtime twin of `drizzle/*.sql`: it adds every column
this build needs with `if not exists`, once per process, so a deployment with no
migration step still works. When you add a column in one, add it in the other.

## Mail drivers

`src/lib/mailer.ts` resolves, per tenant: the OAuth mailbox (Gmail API or Microsoft
Graph on a send-only grant) → the tenant's own SMTP mailbox → the platform `SMTP_URL`
→ a refusing no-op, so a send is marked failed and never faked. Add a vendor by
implementing `MailDriver` and returning it from `resolveDriver`.

## Integrations

Signed outbound webhooks for every send event, and one inbound URL for contacts from
HawkSoft, EZLynx, Follow Up Boss or Zapier. See `docs/INTEGRATIONS.md`.

## Licence

Proprietary. © Fusion Data Company.
