-- A check has one behaviour, so there is no mode to choose and no column to
-- record which one a job ran under. Every job that was ever claimed carried
-- the same value.
ALTER TABLE "review_jobs" DROP CONSTRAINT "review_jobs_mode_valid";--> statement-breakpoint
ALTER TABLE "review_jobs" DROP COLUMN "mode";--> statement-breakpoint

-- The setting goes with it. A row left behind is read by nothing and would
-- reappear in the settings API as a key the dashboard cannot edit.
DELETE FROM "app_settings" WHERE "key" = 'review.mode';
