CREATE TABLE "pending_sponsorships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"social_media" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"claim" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pending_sponsorships_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE INDEX "idx_pending_sponsorships_created_at" ON "pending_sponsorships" USING btree ("created_at");