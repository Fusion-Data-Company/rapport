# Rapport - night report, 2026-09-08

Repo: `Fusion-Data-Company/rapport`, branch `main`.
Start: `5a85c7d`. End: **`37bc03f`**.
Demo: https://rapport-demo-ruby.vercel.app (project `prj_KzOaWNfdRTxTmcbI6I5irdqgFpWH`).
The LIVE project and rapport.fusiondataco.com were not touched.

## What changed and why

The comps verdict was that Rapport as built is a birthday-email bot, and that email
birthday notes are the least-valued touch in this category. Levitate sells the same
mechanic at roughly ten times the price with a human specialist attached. The niche
is solo insurance agents and loan officers priced out of that. Every item below moves
the product toward that buyer.

1. **Gmail and Microsoft 365 OAuth** (`src/lib/oauth.ts`, `src/lib/mailer.ts`,
   `src/app/api/oauth/[provider]/*`). Full consent flow with an HMAC-signed,
   short-lived state parameter compared in constant time, refresh-token rotation,
   and a mailbox health screen. Refresh tokens are sealed with the existing
   `seal()`/`open()` in `src/lib/crypto.ts`. Google is requested at `gmail.send`
   scope only, so Rapport can send as the agent and read nothing. Microsoft goes
   through Graph `sendMail`. When the client-id env vars are unset the provider is
   hidden rather than broken, and SMTP stays the fallback. Deliverability
   guardrails: per-mailbox daily cap (default 40), a warm-up ramp for new
   mailboxes, plain-text-first bodies, and an SPF/DKIM check surfaced in settings
   (`src/lib/send-caps.ts`, `src/lib/dns-check.ts`, `src/lib/email-body.ts`).
2. **The money dates** (`src/lib/occasions.ts`, `src/lib/dates.ts`, migrations
   `0004`). Policy renewal, loan anniversary, home-purchase anniversary, "N months
   since close", and arbitrary custom dates per contact. The renewal note goes out
   ahead of the date on a configurable lead, because after it renews the
   conversation is a bill. CSV import understands the words the source systems
   actually use, including "x date" and "expiration". The daily cron picks these up
   alongside birthdays.
3. **Notes drafted from real history** (`src/lib/timeline.ts`, `src/lib/llm/index.ts`).
   A per-contact timeline of notes, past sends and pasted replies. The last five
   entries go into the prompt, which is told to prefer them over the static profile,
   not to repeat a note already sent, and not to quote a reply back. Wired into the
   daily cron and the review-request path.
4. **Everyday approval queue** (`src/app/(app)/schedule/page.tsx`). Each pending note
   is a card with edit-in-place, approve, skip, and approve-all-today, sized for a
   thumb. Per-tenant `always_review` defaults on; the old first-batch hold is now a
   special case of it.
5. **Contact tiers and real plan rungs** (`src/lib/tiers.ts`). A/B/C drive minimum
   days between touches. The 250-per-seat cap is gone, replaced by 500 / 1,500 /
   5,000 as soft limits that never block an import, only explain the next rung.
6. **Signed webhooks and a real import path** (`src/lib/webhooks.ts`,
   `docs/INTEGRATIONS.md`). Stripe-shaped `t=,v1=` HMAC signatures, Zapier-compatible
   payloads, an inbound token endpoint, and documented CSV/webhook paths for HawkSoft,
   EZLynx and Follow Up Boss. Import has column mapping, dedupe on email and a dry-run
   preview, because a stale profile is what kills this product at month three.
7. **Google review request** as a touch type, N days after a closing, with the link
   configurable per tenant and appended after drafting so the model cannot mangle it.
8. **Repositioning.** Landing page, onboarding and screenshots now lead with the
   renewal story for independent insurance agents, loan officers second. The
   "recruiters, account managers" framing is gone. Existing design system, dark-mode
   first.

Also: `MODEL.md` (hosted seats, $39 solo to 1,000 contacts, $79 to 5,000 with
texting, pass-through card costs later, and why $29 with a 250 cap was wrong in both
directions). Texting via 10DLC and mailed cards are designed in MODEL.md only. No
Twilio, no Thanks.io, no paid vendor was integrated. No Clerk work.

A final pass replaced curly-quote entities and em-dashes with straight quotes and
plain hyphens in everything a customer reads.

## Verified live

Deployment `dpl_...` for `37bc03f` reached **READY**. Checked with curl:

| Path | Status |
|---|---|
| `/` | 200 |
| `/sign-in` | 200 |
| `/terms` | 200 |
| `/privacy` | 200 |
| `/schedule` | 307 to `/sign-in?redirect_url=%2Fschedule` |
| `/settings` | 307 to sign-in |
| `/settings/email` | 307 to sign-in |
| `/settings/integrations` | 307 to sign-in |
| `/settings/cadence` | 307 to sign-in |

The 307s are correct: signed-out visitors are sent to sign-in with the destination
preserved, rather than the 404 they used to get. Landing page scanned clean for
curly quotes, em-dashes and the banned copy words.

`npm run build` passes and `npm run lint` reports 0 errors (20 warnings, all the
pre-existing React Compiler "incompatible library" notices from TanStack Table).

## ERRORS.md

None. No item was abandoned.

## Note on the push

The eight feature commits had already been pushed by an earlier run of this session;
the local clone's `origin/main` ref was stale, which made them look unpushed. Remote
history was confirmed commit-by-commit and the local HEAD tree was byte-identical to
the remote tree (`a92a093`) before the final commit went on top. Nothing was lost and
nothing was duplicated.
