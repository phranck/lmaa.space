-- Every sponsorship already recorded becomes the payment that paid for it, so
-- the ledger is complete from its first day rather than from today onwards.
--
-- The route is set to a transfer because that is how a sponsorship is paid: the
-- support page hands out an account and a reference, and the sponsor row itself
-- never recorded which way the money came. `published` stays false even for a
-- sponsor who is named on the site, because what they agreed to is a name on
-- the sponsor wall and this flag governs a donor list that does not exist yet.
--
-- Guarded by NOT EXISTS so a re-run adds nothing. The migration runner applies
-- each file once, and this holds should the file ever be replayed by hand.
INSERT INTO "donations" (
  "first_name",
  "last_name",
  "social_media",
  "published",
  "amount_cents",
  "received_at",
  "provider",
  "note",
  "sponsor_id"
)
SELECT
  "sponsors"."first_name",
  "sponsors"."last_name",
  "sponsors"."social_media",
  false,
  "sponsors"."amount_cents",
  "sponsors"."paid_at",
  'sepa',
  '',
  "sponsors"."id"
FROM "sponsors"
WHERE NOT EXISTS (
  SELECT 1 FROM "donations" WHERE "donations"."sponsor_id" = "sponsors"."id"
);
