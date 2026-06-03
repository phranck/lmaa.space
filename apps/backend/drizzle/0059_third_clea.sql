CREATE TABLE "social_preview_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text NOT NULL,
	"media_asset_id" integer,
	"composition" jsonb NOT NULL,
	"width" integer DEFAULT 1200 NOT NULL,
	"height" integer DEFAULT 630 NOT NULL,
	"format" text DEFAULT 'image/jpeg' NOT NULL,
	"quality" integer DEFAULT 90 NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_preview_images_format_check" CHECK ("social_preview_images"."format" IN ('image/jpeg', 'image/png', 'image/webp'))
);
--> statement-breakpoint
ALTER TABLE "social_preview_images" ADD CONSTRAINT "social_preview_images_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_preview_images" ADD CONSTRAINT "social_preview_images_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_social_preview_images_created_at" ON "social_preview_images" USING btree ("created_at");