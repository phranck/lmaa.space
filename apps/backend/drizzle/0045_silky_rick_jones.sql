CREATE TABLE "mastodon_post_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"is_system_template" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mastodon_post_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "social_media_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'mastodon' NOT NULL,
	"label" text NOT NULL,
	"instance_url" text NOT NULL,
	"username" text,
	"access_token" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_media_accounts_platform_check" CHECK ("social_media_accounts"."platform" IN ('mastodon')),
	CONSTRAINT "social_media_accounts_visibility_check" CHECK ("social_media_accounts"."visibility" IN ('public', 'unlisted', 'private', 'direct'))
);
--> statement-breakpoint
CREATE INDEX "idx_social_media_accounts_platform_active" ON "social_media_accounts" USING btree ("platform","is_active");