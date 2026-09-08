-- The Google review request touch: the tenant's own review link and when to ask.

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "google_review_url" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "review_request_days" integer NOT NULL DEFAULT 30;
