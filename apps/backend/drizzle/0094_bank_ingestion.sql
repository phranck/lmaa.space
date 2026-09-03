CREATE TABLE "bank_account_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	"succeeded" boolean DEFAULT false NOT NULL,
	"booked_through" text,
	"transactions_read" integer DEFAULT 0 NOT NULL,
	"imported" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "bank_account_reads_kind" CHECK ("bank_account_reads"."kind" IN ('background', 'manual'))
);
--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "external_ref" text;--> statement-breakpoint
CREATE INDEX "idx_bank_account_reads_read_at" ON "bank_account_reads" USING btree ("read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_donations_external_ref" ON "donations" USING btree ("external_ref");