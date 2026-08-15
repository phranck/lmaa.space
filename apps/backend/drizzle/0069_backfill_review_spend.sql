-- Every attempt that ran before the ledger existed is booked into it, so the
-- spend total covers the whole history and not only what happens from now on.
INSERT INTO "review_spend" (
	"job_id",
	"submission_id",
	"attempt",
	"model",
	"synthetic",
	"cost_nano",
	"cost_currency",
	"cost_rate_card_version",
	"cost_complete",
	"spent_at"
)
SELECT
	"j"."id",
	"j"."submission_id",
	("a"->>'attempt')::int,
	COALESCE("a"->>'model', 'unbekannt'),
	"j"."synthetic",
	COALESCE(("a"->'cost'->>'totalNano')::bigint, 0),
	COALESCE("a"->'cost'->>'currency', 'USD'),
	COALESCE("a"->'cost'->>'rateCardVersion', 'unbekannt'),
	COALESCE(("a"->'cost'->>'complete')::boolean, false),
	COALESCE(("a"->>'finishedAt')::timestamp, "j"."created_at")
FROM "review_jobs" "j", jsonb_array_elements("j"."attempts") "a"
WHERE NOT EXISTS (
	SELECT 1 FROM "review_spend" "s"
	WHERE "s"."job_id" = "j"."id" AND "s"."attempt" = ("a"->>'attempt')::int
);
