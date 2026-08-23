ALTER TABLE "sponsors" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "last_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "social_media" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "sponsors" DROP COLUMN "handle";