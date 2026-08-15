CREATE TABLE "review_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"state" text NOT NULL,
	"event" text NOT NULL,
	"detail" text,
	"error_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_events_state_valid" CHECK ("review_events"."state" IN ('queued', 'running', 'provider_waiting', 'applying', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "review_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"mode" text DEFAULT 'off' NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	"verdict" text,
	"provider" text,
	"model" text,
	"reasoning_effort" text,
	"skill_version" text,
	"schema_version" text,
	"provider_response_id" text,
	"result" jsonb,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attempts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"usage" jsonb,
	"cost_nano" bigint DEFAULT 0 NOT NULL,
	"cost_currency" text,
	"cost_rate_card_version" text,
	"cost_complete" boolean DEFAULT false NOT NULL,
	"cost_missing_dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"onhold_reason" text,
	"lease_owner" text,
	"lease_expires_at" timestamp,
	"next_run_at" timestamp DEFAULT now() NOT NULL,
	"report_state" text DEFAULT 'pending' NOT NULL,
	"report_attempts" integer DEFAULT 0 NOT NULL,
	"report_last_attempt_at" timestamp,
	"report_error" text,
	"error_code" text,
	"error_id" text,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_jobs_state_valid" CHECK ("review_jobs"."state" IN ('queued', 'running', 'provider_waiting', 'applying', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "review_jobs_verdict_valid" CHECK ("review_jobs"."verdict" IS NULL OR "review_jobs"."verdict" IN ('accept', 'reject', 'onhold')),
	CONSTRAINT "review_jobs_mode_valid" CHECK ("review_jobs"."mode" IN ('off', 'shadow', 'assist')),
	CONSTRAINT "review_jobs_report_state_valid" CHECK ("review_jobs"."report_state" IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
	CONSTRAINT "review_jobs_cost_nonnegative" CHECK ("review_jobs"."cost_nano" >= 0)
);
--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_job_id_review_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."review_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_jobs" ADD CONSTRAINT "review_jobs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_review_events_job" ON "review_events" USING btree ("job_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_review_jobs_active_submission" ON "review_jobs" USING btree ("submission_id") WHERE "review_jobs"."state" IN ('queued', 'running', 'provider_waiting', 'applying');--> statement-breakpoint
CREATE INDEX "idx_review_jobs_claim" ON "review_jobs" USING btree ("state","next_run_at");--> statement-breakpoint
CREATE INDEX "idx_review_jobs_lease" ON "review_jobs" USING btree ("lease_expires_at");--> statement-breakpoint
CREATE INDEX "idx_review_jobs_submission" ON "review_jobs" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "idx_review_jobs_report" ON "review_jobs" USING btree ("report_state");