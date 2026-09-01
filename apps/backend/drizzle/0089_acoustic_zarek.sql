CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"social_media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"received_at" text NOT NULL,
	"provider" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"sponsor_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "donations_amount_nonnegative" CHECK ("donations"."amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_donations_received_at" ON "donations" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_donations_sponsor_id" ON "donations" USING btree ("sponsor_id");