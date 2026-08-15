CREATE TABLE "review_spend" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"submission_id" integer,
	"attempt" integer NOT NULL,
	"model" text NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	"cost_nano" bigint NOT NULL,
	"cost_currency" text NOT NULL,
	"cost_rate_card_version" text NOT NULL,
	"cost_complete" boolean DEFAULT true NOT NULL,
	"spent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_spend_cost_nonnegative" CHECK ("review_spend"."cost_nano" >= 0)
);
--> statement-breakpoint
CREATE INDEX "idx_review_spend_day" ON "review_spend" USING btree ("spent_at");--> statement-breakpoint
CREATE INDEX "idx_review_spend_job" ON "review_spend" USING btree ("job_id");