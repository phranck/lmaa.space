CREATE TABLE "hero_daily_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"schedule" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_daily_schedule_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "hero_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"photographer" text NOT NULL,
	"photographer_url" text NOT NULL,
	"download_location" text NOT NULL,
	"is_selected" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
