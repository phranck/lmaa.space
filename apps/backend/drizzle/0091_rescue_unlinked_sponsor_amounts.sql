-- Anything still holding a sponsor's amount and nothing else moves into the
-- ledger before the next migration drops the column.
--
-- Migration 0090 already copied every sponsor that existed when it ran. This
-- catches whoever was recorded between that migration and this one, because the
-- takeover did not yet write a payment and their amount would otherwise be
-- dropped with the column.
--
-- Guarded by NOT EXISTS, as 0090 is, so a sponsor already carrying a payment
-- gains nothing here and no amount is counted twice.
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
