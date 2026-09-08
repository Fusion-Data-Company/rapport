-- The second set was still thin: a small vignette floating on a big empty field, which
-- is not what a Hallmark card looks like. This set is the one that ships. Same eight
-- occasions, same "the name is printed on the cardstock" rule, but the artwork now
-- fills the panel, the stock changes with the occasion (a closing anniversary is navy
-- and gold, a child's birthday is soft white), and the occasion line is set in real
-- foil script with the recipient's first name in it.
--
-- The files are replaced in place, so the URLs do not change and no row has to move.
-- What does change is the description an agent reads in the gallery, and the
-- months_since_close line, which is now the one src/lib/card-image.ts prints.

UPDATE "card_templates" SET
  "name"        = v.nm,
  "description" = v.descr,
  "is_active"   = true
FROM (VALUES
  ('birthday',           'Roses and one candle',  'Happy Birthday, <name>. Gold foil copperplate on ivory cotton rag.'),
  ('anniversary',        'Coupes and peonies',    'Happy Anniversary, <name>. Gold foil copperplate on ivory cotton rag.'),
  ('child_birthday',     'Balloons and confetti', 'Happy Birthday, <name>. Hand-lettered gold foil on soft white, for a child.'),
  ('policy_renewal',     'The sheltering oak',    'Here''s to Another Year, <name>. Gold foil copperplate on warm ivory.'),
  ('home_anniversary',   'Brass key and cottage', 'Happy Home Anniversary, <name>. Gold foil copperplate on warm cream.'),
  ('loan_anniversary',   'The wreathed door',     'Happy Closing Anniversary, <name>. Gold foil on deep navy cotton.'),
  ('months_since_close', 'Two cups and a posy',   'Good to Know You, <name>. Gold foil copperplate on warm ivory.'),
  ('review_request',     'The laurel wreath',     'Thank You, <name>. Gold foil copperplate on ivory cotton rag.')
) AS v(occ,nm,descr)
WHERE "card_templates"."tenant_id" IS NULL AND "card_templates"."occasion_type" = v.occ;

-- A database that has never seen 0009 or 0010 still ends up with the full set.
INSERT INTO "card_templates" ("tenant_id","occasion_type","name","description","image_url","thumbnail_url","is_system","is_active")
SELECT NULL, v.occ, v.nm, v.descr,
  'https://rapport-demo-ruby.vercel.app/img/cards/' || v.f || '.jpg',
  'https://rapport-demo-ruby.vercel.app/img/cards/' || v.f || '-thumb.jpg',
  true, true
FROM (VALUES
  ('birthday',           'Roses and one candle',  'Happy Birthday, <name>. Gold foil copperplate on ivory cotton rag.',                'birthday'),
  ('anniversary',        'Coupes and peonies',    'Happy Anniversary, <name>. Gold foil copperplate on ivory cotton rag.',             'anniversary'),
  ('child_birthday',     'Balloons and confetti', 'Happy Birthday, <name>. Hand-lettered gold foil on soft white, for a child.',       'child-birthday'),
  ('policy_renewal',     'The sheltering oak',    'Here''s to Another Year, <name>. Gold foil copperplate on warm ivory.',             'policy-renewal'),
  ('home_anniversary',   'Brass key and cottage', 'Happy Home Anniversary, <name>. Gold foil copperplate on warm cream.',              'home-anniversary'),
  ('loan_anniversary',   'The wreathed door',     'Happy Closing Anniversary, <name>. Gold foil on deep navy cotton.',                 'loan-anniversary'),
  ('months_since_close', 'Two cups and a posy',   'Good to Know You, <name>. Gold foil copperplate on warm ivory.',                    'months-since-close'),
  ('review_request',     'The laurel wreath',     'Thank You, <name>. Gold foil copperplate on ivory cotton rag.',                     'review-request')
) AS v(occ,nm,descr,f)
WHERE NOT EXISTS (
  SELECT 1 FROM "card_templates" c
  WHERE c."tenant_id" IS NULL AND c."occasion_type" = v.occ
);
