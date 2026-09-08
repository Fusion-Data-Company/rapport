-- Signed outbound webhooks, and the per-tenant inbound token an AMS, CRM or Zapier posts to.

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "inbound_token" text;
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_inbound_token_idx" ON "tenants" ("inbound_token") WHERE "inbound_token" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "secret_encrypted" text NOT NULL,
  "description" text,
  "events" text[],
  "is_active" boolean NOT NULL DEFAULT true,
  "last_status" integer,
  "last_error" text,
  "last_attempt_at" timestamptz,
  "consecutive_failures" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "webhook_endpoints_tenant_idx" ON "webhook_endpoints" ("tenant_id");
