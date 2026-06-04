CREATE TABLE "media_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"color" text,
	"system_key" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "media_folders_system_key_unique" UNIQUE("system_key")
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "folder_id" integer;--> statement-breakpoint
INSERT INTO "media_folders" ("name", "color", "system_key", "is_system")
VALUES ('Social Media', 'purple', 'social-media', true)
ON CONFLICT ("system_key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "is_system" = true,
  "updated_at" = now();--> statement-breakpoint
UPDATE "media_assets"
SET "folder_id" = (SELECT "id" FROM "media_folders" WHERE "system_key" = 'social-media')
WHERE "id" IN (
  SELECT "media_asset_id" FROM "social_preview_images" WHERE "media_asset_id" IS NOT NULL
);--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_media_folders_parent" ON "media_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_media_folders_parent_name" ON "media_folders" USING btree ("parent_id","name") WHERE "media_folders"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_media_folders_root_name" ON "media_folders" USING btree ("name") WHERE "media_folders"."parent_id" IS NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_folder_id_media_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."media_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_media_assets_folder" ON "media_assets" USING btree ("folder_id");