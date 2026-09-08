-- Each note carries its own card, because the card is made for the person the note
-- is going to. card_image_url is the picture that actually gets sent, card_note is
-- the line the sender added for the artwork, and card_source records where the
-- picture came from so the approval queue can say so.

ALTER TABLE "scheduled_sends"
  ADD COLUMN IF NOT EXISTS "card_image_url" text,
  ADD COLUMN IF NOT EXISTS "card_note" text,
  ADD COLUMN IF NOT EXISTS "card_source" text;

-- Rows already written keep the card they were queued with.
UPDATE "scheduled_sends" s
SET "card_image_url" = c."image_url",
    "card_source"    = CASE WHEN c."tenant_id" IS NULL THEN 'system' ELSE 'tenant' END
FROM "card_templates" c
WHERE s."card_template_id" = c."id" AND s."card_image_url" IS NULL;
