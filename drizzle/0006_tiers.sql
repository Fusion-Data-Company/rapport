-- Contact tiers and their cadence, and the end of the hard 250-per-seat contact cap.

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "tier" text NOT NULL DEFAULT 'B';
CREATE INDEX IF NOT EXISTS "contacts_tenant_tier_idx" ON "contacts" ("tenant_id", "tier");

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "tier_a_min_days" integer NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "tier_b_min_days" integer NOT NULL DEFAULT 21;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "tier_c_min_days" integer NOT NULL DEFAULT 75;
