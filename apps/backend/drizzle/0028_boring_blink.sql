ALTER TABLE "media_assets" ADD COLUMN "alias" text;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_media_assets_alias" ON "media_assets" USING btree ("alias");
