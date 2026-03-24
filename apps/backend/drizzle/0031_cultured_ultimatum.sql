CREATE TABLE "affiliate_scan_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_shops" integer DEFAULT 0 NOT NULL,
	"completed_shops" integer DEFAULT 0 NOT NULL,
	"failed_shops" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_by" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "affiliate_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"status" text DEFAULT 'none' NOT NULL,
	"program_found" boolean DEFAULT false NOT NULL,
	"program_type" text,
	"program_url" text,
	"network_name" text,
	"compensation_model" text,
	"commission" text,
	"cookie_duration" text,
	"payout_threshold" text,
	"application_url" text,
	"contact_email" text,
	"requirements" text,
	"notes" text,
	"recommendation" text,
	"tracking_status" text DEFAULT 'open' NOT NULL,
	"tracking_note" text,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"scanned_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_scans_shop_id_unique" UNIQUE("shop_id"),
	CONSTRAINT "affiliate_scans_status_check" CHECK ("affiliate_scans"."status" IN ('direct', 'network', 'inquiry', 'none')),
	CONSTRAINT "affiliate_scans_tracking_check" CHECK ("affiliate_scans"."tracking_status" IN ('open', 'contacted', 'confirmed', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "affiliate_scan_jobs" ADD CONSTRAINT "affiliate_scan_jobs_started_by_admin_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_scans" ADD CONSTRAINT "affiliate_scans_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_scans" ADD CONSTRAINT "affiliate_scans_scanned_by_admin_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_affiliate_scans_status" ON "affiliate_scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_affiliate_scans_tracking" ON "affiliate_scans" USING btree ("tracking_status");--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "shop_check_notes";--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "shop_check_notes";