-- OAuth sending mailbox (Gmail API / Microsoft Graph) and the deliverability guardrails.
-- Equivalent to `drizzle-kit push` for the tenant_email_config changes in src/lib/db/schema.ts.

ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "oauth_email" text;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "oauth_refresh_token_encrypted" text;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "oauth_scope" text;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "oauth_connected_at" timestamptz;

ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "daily_cap" integer NOT NULL DEFAULT 40;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "warmup_started_at" timestamptz;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "body_style" text NOT NULL DEFAULT 'plain';

ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "spf_status" text;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "dkim_status" text;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "dmarc_status" text;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "dns_detail" jsonb;
ALTER TABLE "tenant_email_config" ADD COLUMN IF NOT EXISTS "dns_checked_at" timestamptz;

-- "resend" was never a real driver here; anything left on it is an unconfigured row.
UPDATE "tenant_email_config" SET "provider" = 'smtp' WHERE "provider" = 'resend';
ALTER TABLE "tenant_email_config" ALTER COLUMN "provider" SET DEFAULT 'smtp';
