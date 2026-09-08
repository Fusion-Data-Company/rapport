-- Every occasion gets a card. Eight generated for Rapport: warm, adult, no text on
-- the artwork so the agent's own words carry the note. tenant_id NULL means system
-- card, available to every tenant until they upload their own.

INSERT INTO "card_templates" ("tenant_id","occasion_type","name","description","image_url","thumbnail_url","is_system","is_active")
SELECT NULL, v.occ, v.nm,
  'Generated for Rapport. Warm, adult, no text so your words carry the note.',
  'https://rapport-demo-ruby.vercel.app/img/cards/' || v.f || '.jpg',
  'https://rapport-demo-ruby.vercel.app/img/cards/' || v.f || '-thumb.jpg',
  true, true
FROM (VALUES
  ('birthday','A candle, lit','birthday'),
  ('anniversary','Two glasses','anniversary'),
  ('child_birthday','Balloons at dusk','child-birthday'),
  ('policy_renewal','Pen and papers','policy-renewal'),
  ('home_anniversary','The key','home-anniversary'),
  ('loan_anniversary','The key','home-anniversary'),
  ('months_since_close','Two cups','closing-anniversary'),
  ('review_request','Laurel','congratulations')
) AS v(occ,nm,f)
WHERE NOT EXISTS (
  SELECT 1 FROM "card_templates" c
  WHERE c."tenant_id" IS NULL AND c."occasion_type" = v.occ
);
