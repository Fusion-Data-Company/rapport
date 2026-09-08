-- Every occasion gets a card, and the card has the person's name printed on it.
-- Eight generated for Rapport: ivory letterpress cardstock, watercolour and ink
-- artwork, and the occasion line set in foil script with the recipient's first
-- name. tenant_id NULL means system card, available to every tenant until they
-- upload their own or the runtime generator makes a named one.

INSERT INTO "card_templates" ("tenant_id","occasion_type","name","description","image_url","thumbnail_url","is_system","is_active")
SELECT NULL, v.occ, v.nm, v.descr,
  'https://rapport-demo-ruby.vercel.app/img/cards/' || v.f || '.jpg',
  'https://rapport-demo-ruby.vercel.app/img/cards/' || v.f || '-thumb.jpg',
  true, true
FROM (VALUES
  ('birthday','Candle and cake','Happy Birthday, <name>. Foil script on ivory letterpress.','birthday'),
  ('anniversary','Two coupes','Happy Anniversary, <name>. Foil script on ivory letterpress.','anniversary'),
  ('child_birthday','Balloons','Happy Birthday, <name>. Hand-lettered, for a child.','child-birthday'),
  ('policy_renewal','The oak','Here is to Another Year, <name>. Foil script on ivory letterpress.','policy-renewal'),
  ('home_anniversary','The key','Happy Home Anniversary, <name>. Foil script on ivory letterpress.','home-anniversary'),
  ('loan_anniversary','The blue door','Happy Closing Anniversary, <name>. Foil script on ivory letterpress.','loan-anniversary'),
  ('months_since_close','Two cups','Six Months In, <name>. Foil script on ivory letterpress.','months-since-close'),
  ('review_request','Laurel','Thank You, <name>. Foil script on ivory letterpress.','review-request')
) AS v(occ,nm,descr,f)
WHERE NOT EXISTS (
  SELECT 1 FROM "card_templates" c
  WHERE c."tenant_id" IS NULL AND c."occasion_type" = v.occ
);
