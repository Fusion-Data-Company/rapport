-- Billing + unsubscribe columns. Equivalent to `drizzle-kit push` for the schema changes in src/lib/db/schema.ts.
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subscription_status" text NOT NULL DEFAULT 'trialing';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "seats" integer NOT NULL DEFAULT 1;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamptz DEFAULT (now() + interval '14 days');
-- Existing tenants get a fresh 14-day trial from the moment this runs.
UPDATE "tenants" SET "trial_ends_at" = now() + interval '14 days' WHERE "trial_ends_at" IS NULL;

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "unsubscribed" boolean NOT NULL DEFAULT false;
