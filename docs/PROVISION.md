# Provisioning a Rapport buyer

Three instances exist and never mix:

| Instance | Vercel project | Database | Auth | Who touches it |
|---|---|---|---|---|
| LIVE `rapport.fusiondataco.com` | `rapport` | Neon (live) | Clerk production | Frozen. Never sold, never linked, never migrated. |
| DEMO `rapport-demo-ruby.vercel.app` | `rapport-demo` | Neon `patient-band-45786990` | Clerk dev instance | The only URL the website, catalog and emails point at. Fictional seed data only. |
| BUYER `<slug>.fusiondataco.com` | `rapport-<slug>` | Neon, new project | Clerk production (subdomain of the primary domain) | One per paying customer. |

## When a buyer pays

Trigger: Stripe `checkout.session.completed` on the Rapport seat price
(`price_1UChi6EkfFOXPr6DCFYJUHzR`), or a signed WL deposit. Promise on the page is
"within 1 business day". Budget: 30 minutes.

1. **Neon** – create project `rapport-<slug>` (region us-east-2). Copy the pooled connection string.
2. **Schema** – on the device VM: `cd ~/work/rapport && DATABASE_URL=<neon> npx drizzle-kit push --force`.
3. **Vercel** – create project `rapport-<slug>` linked to `Fusion-Data-Company/rapport`, branch `main`.
   Set env (all environments) **before** the first deploy:
   ```
   DATABASE_URL                     <neon>
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY $RAPPORT_CLERK_PK_LIVE
   CLERK_SECRET_KEY                 $RAPPORT_CLERK_SK_LIVE
   NEXT_PUBLIC_CLERK_SIGN_IN_URL    /sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL    /sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL /dashboard
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL /onboarding
   NEXT_PUBLIC_APP_URL              https://<slug>.fusiondataco.com
   NEXT_PUBLIC_DEMO_MODE            false      (never true on a buyer)
   STRIPE_SECRET_KEY                live key
   STRIPE_PRICE_ID                  price_1UChi6EkfFOXPr6DCFYJUHzR
   STRIPE_WEBHOOK_SECRET            from step 5
   CRON_SECRET, UNSUBSCRIBE_SECRET  `openssl rand -hex 32` each
   OPENROUTER_API_KEY               platform key (tenant may bring their own in Settings)
   SMTP_URL                         optional platform fallback; buyer connects their own mailbox in Settings → Email
   ```
4. **Domain** – add `<slug>.fusiondataco.com` to the project (apex is on Vercel DNS, so it verifies
   itself). Clerk production keys already cover every subdomain of fusiondataco.com; nothing to
   change in Clerk.
5. **Stripe webhook** – add endpoint `https://<slug>.fusiondataco.com/api/stripe/webhook` with
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`;
   paste the signing secret into `STRIPE_WEBHOOK_SECRET`.
6. **Deploy** – `POST /v13/deployments` (or push an empty commit). Confirm `/sign-up` serves the
   `pk_live_` key and `/` has no demo bar.
7. **Hand-off email** to the buyer: their URL, "create your account, then Settings → Email to connect
   the mailbox your notes send from", and the customer-portal link for billing.
8. **Record** – add the slug, Neon project id, Vercel project id and webhook id to
   `~/Projects/_xfer/rapport-buyers.txt` on the device.

## Custom integrations

Every integration in Rapport is an interface with swappable drivers (`src/lib/mailer.ts`,
`src/lib/llm.ts`). A buyer who wants a specific CRM, mailer or model gets a driver added on their
own branch/env; the demo and live instances are not touched.

## Tear-down

Cancel the Stripe subscription → delete the Vercel project → delete the Neon project → remove the
line from `rapport-buyers.txt`. The buyer's data goes with the Neon project; export first if asked.
