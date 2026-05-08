-- Migration pre-condition: at most one Mastodon account exists.
-- Aborts if more than one row would violate the soon-to-be-added UNIQUE constraint.
DO $$
BEGIN
  IF (SELECT count(*) FROM social_media_accounts WHERE platform = 'mastodon') > 1 THEN
    RAISE EXCEPTION 'Migration aborted: more than one mastodon account exists. '
      'Delete or merge surplus rows manually before retrying.';
  END IF;
END $$;
--> statement-breakpoint

-- Drop the old single-value platform CHECK to allow 'bluesky'.
ALTER TABLE "social_media_accounts" DROP CONSTRAINT IF EXISTS "social_media_accounts_platform_check";--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_platform_check" CHECK ("social_media_accounts"."platform" IN ('mastodon', 'bluesky'));--> statement-breakpoint

-- Allow visibility NULL (BlueSky rows have no visibility value).
ALTER TABLE "social_media_accounts" DROP CONSTRAINT IF EXISTS "social_media_accounts_visibility_check";--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "visibility" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "visibility" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_visibility_check" CHECK ("social_media_accounts"."visibility" IS NULL OR "social_media_accounts"."visibility" IN ('public', 'unlisted', 'private', 'direct'));--> statement-breakpoint

-- Drop platform default to require explicit insert per row.
ALTER TABLE "social_media_accounts" ALTER COLUMN "platform" DROP DEFAULT;--> statement-breakpoint

-- New columns. max_post_characters added as nullable, backfilled, then SET NOT NULL.
ALTER TABLE "social_media_accounts" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD COLUMN "max_post_characters" integer;--> statement-breakpoint
UPDATE "social_media_accounts" SET "max_post_characters" = 500 WHERE "platform" = 'mastodon';--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "max_post_characters" SET NOT NULL;--> statement-breakpoint

-- Make instance_url default empty so BlueSky rows can omit it.
ALTER TABLE "social_media_accounts" ALTER COLUMN "instance_url" SET DEFAULT '';--> statement-breakpoint

-- Add CHECKs for platform-specific required fields.
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_handle_required_for_bluesky" CHECK ("social_media_accounts"."platform" <> 'bluesky' OR "social_media_accounts"."handle" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "social_media_accounts" ADD CONSTRAINT "social_media_accounts_instance_required_for_mastodon" CHECK ("social_media_accounts"."platform" <> 'mastodon' OR "social_media_accounts"."instance_url" <> '');--> statement-breakpoint

-- Singleton constraint: at most one account per platform.
CREATE UNIQUE INDEX "social_media_accounts_platform_unique" ON "social_media_accounts" USING btree ("platform");--> statement-breakpoint

-- Sticky template-choice table.
CREATE TABLE "admin_user_account_template_choice" (
	"admin_user_id" integer NOT NULL,
	"social_media_account_id" integer NOT NULL,
	"template_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_user_account_template_choice_admin_user_id_social_media_account_id_pk" PRIMARY KEY("admin_user_id","social_media_account_id")
);
--> statement-breakpoint
ALTER TABLE "admin_user_account_template_choice" ADD CONSTRAINT "admin_user_account_template_choice_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_account_template_choice" ADD CONSTRAINT "admin_user_account_template_choice_social_media_account_id_social_media_accounts_id_fk" FOREIGN KEY ("social_media_account_id") REFERENCES "public"."social_media_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_account_template_choice" ADD CONSTRAINT "admin_user_account_template_choice_template_id_social_media_post_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."social_media_post_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_user_account_template_choice_user" ON "admin_user_account_template_choice" USING btree ("admin_user_id");
