ALTER TABLE "social_media_accounts" DROP CONSTRAINT "social_media_accounts_platform_check";--> statement-breakpoint
ALTER TABLE "social_media_accounts" DROP CONSTRAINT "social_media_accounts_handle_required_for_bluesky";--> statement-breakpoint
ALTER TABLE "social_media_accounts" DROP CONSTRAINT "social_media_accounts_instance_required_for_mastodon";--> statement-breakpoint
DROP INDEX "social_media_accounts_platform_unique";--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "access_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "max_post_characters" DROP NOT NULL;--> statement-breakpoint
-- Add profile_url as nullable, backfill per platform, then enforce NOT NULL.
ALTER TABLE "social_media_accounts" ADD COLUMN "profile_url" text;--> statement-breakpoint
UPDATE "social_media_accounts" SET "profile_url" = "instance_url" || '/@' || "username" WHERE "platform" = 'mastodon' AND "username" IS NOT NULL;--> statement-breakpoint
UPDATE "social_media_accounts" SET "profile_url" = "instance_url" WHERE "platform" = 'mastodon' AND ("username" IS NULL OR "username" = '');--> statement-breakpoint
UPDATE "social_media_accounts" SET "profile_url" = 'https://bsky.app/profile/' || "handle" WHERE "platform" = 'bluesky' AND "handle" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "profile_url" SET NOT NULL;--> statement-breakpoint

-- can_post defaults to true for existing rows (they all represent posting accounts).
-- show_in_footer defaults to true for existing rows.
ALTER TABLE "social_media_accounts" ADD COLUMN "can_post" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "can_post" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD COLUMN "show_in_footer" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "social_media_accounts_post_unique" ON "social_media_accounts" USING btree ("platform") WHERE "social_media_accounts"."can_post" = true;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_can_post_platform" CHECK ("social_media_accounts"."can_post" = false OR "social_media_accounts"."platform" IN ('mastodon', 'bluesky'));--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_can_post_token" CHECK ("social_media_accounts"."can_post" = false OR "social_media_accounts"."access_token" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_can_post_max_chars" CHECK ("social_media_accounts"."can_post" = false OR "social_media_accounts"."max_post_characters" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_handle_required_for_bluesky" CHECK ("social_media_accounts"."can_post" = false OR "social_media_accounts"."platform" <> 'bluesky' OR "social_media_accounts"."handle" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_instance_required_for_mastodon" CHECK ("social_media_accounts"."can_post" = false OR "social_media_accounts"."platform" <> 'mastodon' OR "social_media_accounts"."instance_url" <> '');