CREATE TABLE "unsplash_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"unsplash_id" text NOT NULL,
	"url_small" text NOT NULL,
	"url_regular" text NOT NULL,
	"width" integer,
	"height" integer,
	"color" text,
	"blur_hash" text,
	"description" text,
	"alt_description" text,
	"likes" integer,
	"photographer_name" text NOT NULL,
	"photographer_url" text NOT NULL,
	"download_location" text NOT NULL,
	"location_city" text,
	"location_country" text,
	"location_lat" double precision,
	"location_lng" double precision,
	"location_fetched" boolean DEFAULT false NOT NULL,
	"created_at_unsplash" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unsplash_images_unsplash_id_unique" UNIQUE("unsplash_id")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "unsplash_image_id" integer;--> statement-breakpoint
ALTER TABLE "hero_images" ADD COLUMN "unsplash_image_id" integer;--> statement-breakpoint
ALTER TABLE "hero_images" ADD CONSTRAINT "hero_images_unsplash_image_id_unsplash_images_id_fk" FOREIGN KEY ("unsplash_image_id") REFERENCES "public"."unsplash_images"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Data migration: populate unsplash_images from existing hero_images rows
INSERT INTO "unsplash_images" ("unsplash_id", "url_small", "url_regular", "photographer_name", "photographer_url", "download_location")
SELECT
  COALESCE(
    regexp_replace(download_location, '.*/photos/([^/]+)/download.*', '\1'),
    'legacy-hero-' || id
  ),
  url,
  url,
  photographer,
  photographer_url,
  download_location
FROM "hero_images"
ON CONFLICT ("unsplash_id") DO NOTHING;
--> statement-breakpoint
-- Link hero_images to their unsplash_images rows
UPDATE "hero_images" h
SET "unsplash_image_id" = u.id
FROM "unsplash_images" u
WHERE u."unsplash_id" = COALESCE(
  regexp_replace(h.download_location, '.*/photos/([^/]+)/download.*', '\1'),
  'legacy-hero-' || h.id
);
--> statement-breakpoint
-- Migrate categories with Unsplash images (photographer URL contains unsplash.com)
INSERT INTO "unsplash_images" ("unsplash_id", "url_small", "url_regular", "photographer_name", "photographer_url", "download_location")
SELECT
  'legacy-cat-' || id,
  image_url,
  image_url,
  COALESCE(image_photographer, ''),
  COALESCE(image_photographer_url, ''),
  ''
FROM "categories"
WHERE image_url IS NOT NULL AND image_photographer_url LIKE '%unsplash.com%'
ON CONFLICT ("unsplash_id") DO NOTHING;
--> statement-breakpoint
UPDATE "categories" c
SET "unsplash_image_id" = u.id
FROM "unsplash_images" u
WHERE u."unsplash_id" = 'legacy-cat-' || c.id
AND c.image_url IS NOT NULL AND c.image_photographer_url LIKE '%unsplash.com%';