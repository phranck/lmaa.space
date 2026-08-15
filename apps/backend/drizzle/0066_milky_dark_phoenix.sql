ALTER TABLE "review_jobs" DROP CONSTRAINT "review_jobs_mode_valid";--> statement-breakpoint
UPDATE "review_jobs" SET "mode" = 'assist' WHERE "mode" = 'shadow';--> statement-breakpoint
ALTER TABLE "review_jobs" ADD CONSTRAINT "review_jobs_mode_valid" CHECK ("review_jobs"."mode" IN ('off', 'assist'));
