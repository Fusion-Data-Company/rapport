-- The money dates: policy renewal, loan anniversary, home-purchase anniversary,
-- "N months since close", and any custom date per contact.

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "renewal_lead_days" integer NOT NULL DEFAULT 30;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "milestone_months" integer[];
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "always_review" boolean NOT NULL DEFAULT true;

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "policy_renewal_date" date;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "policy_type" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "loan_closed_date" date;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "loan_type" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "home_purchase_date" date;

CREATE TABLE IF NOT EXISTS "contact_dates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "date" date NOT NULL,
  "recurrence" text NOT NULL DEFAULT 'annual',
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "contact_dates_contact_idx" ON "contact_dates" ("contact_id");
CREATE INDEX IF NOT EXISTS "contact_dates_tenant_idx" ON "contact_dates" ("tenant_id");

CREATE INDEX IF NOT EXISTS "contacts_policy_renewal_idx" ON "contacts" ("tenant_id", "policy_renewal_date");
CREATE INDEX IF NOT EXISTS "contacts_loan_closed_idx" ON "contacts" ("tenant_id", "loan_closed_date");
