ALTER TABLE "pending_sponsorships" ALTER COLUMN "social_media" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "shops" ALTER COLUMN "social_media" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sponsors" ALTER COLUMN "social_media" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "social_media" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
UPDATE "pending_sponsorships" SET "social_media" = COALESCE((SELECT jsonb_agg(jsonb_build_object('platform', key, 'url', value) ORDER BY key) FROM jsonb_each_text("social_media") WHERE value <> ''), '[]'::jsonb) WHERE jsonb_typeof("social_media") = 'object';--> statement-breakpoint
UPDATE "shops" SET "social_media" = COALESCE((SELECT jsonb_agg(jsonb_build_object('platform', key, 'url', value) ORDER BY key) FROM jsonb_each_text("social_media") WHERE value <> ''), '[]'::jsonb) WHERE jsonb_typeof("social_media") = 'object';--> statement-breakpoint
UPDATE "sponsors" SET "social_media" = COALESCE((SELECT jsonb_agg(jsonb_build_object('platform', key, 'url', value) ORDER BY key) FROM jsonb_each_text("social_media") WHERE value <> ''), '[]'::jsonb) WHERE jsonb_typeof("social_media") = 'object';--> statement-breakpoint
UPDATE "submissions" SET "social_media" = COALESCE((SELECT jsonb_agg(jsonb_build_object('platform', key, 'url', value) ORDER BY key) FROM jsonb_each_text("social_media") WHERE value <> ''), '[]'::jsonb) WHERE jsonb_typeof("social_media") = 'object';
