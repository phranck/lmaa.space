CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"handle" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"claim" text DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"paid_at" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sponsors_amount_nonnegative" CHECK ("sponsors"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX "idx_sponsors_paid_at" ON "sponsors" USING btree ("paid_at");