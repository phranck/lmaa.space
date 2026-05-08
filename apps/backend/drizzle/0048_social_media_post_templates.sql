ALTER TABLE "mastodon_post_templates" RENAME TO "social_media_post_templates";--> statement-breakpoint
ALTER TABLE "social_media_post_templates" RENAME CONSTRAINT "mastodon_post_templates_name_unique" TO "social_media_post_templates_name_unique";--> statement-breakpoint
ALTER TABLE "social_media_post_templates" ADD COLUMN "platforms" text[] NOT NULL DEFAULT ARRAY['mastodon']::text[];--> statement-breakpoint
ALTER TABLE "social_media_post_templates" ADD COLUMN "body_mastodon" text;--> statement-breakpoint
ALTER TABLE "social_media_post_templates" ADD COLUMN "body_bluesky" text;--> statement-breakpoint
UPDATE "social_media_post_templates" SET "body_mastodon" = "body_text";--> statement-breakpoint
ALTER TABLE "social_media_post_templates" ALTER COLUMN "platforms" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "social_media_post_templates" DROP COLUMN "body_text";--> statement-breakpoint
ALTER TABLE "social_media_post_templates" ADD CONSTRAINT "social_media_post_templates_platforms_nonempty" CHECK (cardinality("social_media_post_templates"."platforms") >= 1);--> statement-breakpoint
ALTER TABLE "social_media_post_templates" ADD CONSTRAINT "social_media_post_templates_body_mastodon_when_selected" CHECK (array_position("social_media_post_templates"."platforms", 'mastodon') IS NULL OR "social_media_post_templates"."body_mastodon" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "social_media_post_templates" ADD CONSTRAINT "social_media_post_templates_body_bluesky_when_selected" CHECK (array_position("social_media_post_templates"."platforms", 'bluesky') IS NULL OR "social_media_post_templates"."body_bluesky" IS NOT NULL);
