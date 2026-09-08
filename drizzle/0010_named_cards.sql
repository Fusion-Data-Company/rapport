-- The first eight system cards were stock art with no words on them, so the name
-- only ever appeared in the email body. The point of a card is that it is made for
-- the person, so every system card is repointed at the new set, where the occasion
-- line and the first name are printed on the cardstock itself. 0009 already ran on
-- existing databases, so this file moves those rows rather than re-inserting them.

UPDATE "card_templates" SET
  "image_url"     = 'https://rapport-demo-ruby.vercel.app/img/cards/' || v.f || '.jpg',
  "thumbnail_url" = 'https://rapport-demo-ruby.vercel.app/img/cards/' || v.f || '-thumb.jpg',
  "name"          = v.nm,
  "description"   = v.descr,
  "is_active"     = true
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
WHERE "card_templates"."tenant_id" IS NULL AND "card_templates"."occasion_type" = v.occ;

-- A database that somehow missed 0009 still ends up with the full set.
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
