-- Per-contact interaction timeline. The writer reads the last few entries so a note
-- can reference the real last conversation rather than the static profile.

CREATE TABLE IF NOT EXISTS "contact_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "kind" text NOT NULL DEFAULT 'note',
  "summary" text,
  "body" text NOT NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "source" text NOT NULL DEFAULT 'manual',
  "scheduled_send_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "contact_timeline_contact_idx" ON "contact_timeline" ("contact_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "contact_timeline_tenant_idx" ON "contact_timeline" ("tenant_id");
