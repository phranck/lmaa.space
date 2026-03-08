CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"original_name" text NOT NULL,
	"stored_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"kind" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "media_assets_stored_filename_unique" UNIQUE("stored_filename")
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_media_assets_kind" ON "media_assets" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_media_assets_created_at" ON "media_assets" USING btree ("created_at");