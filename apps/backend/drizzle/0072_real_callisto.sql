CREATE TABLE "support_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slot" text NOT NULL,
	"kind" text DEFAULT 'card' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"button_label" text DEFAULT '' NOT NULL,
	"button_href" text DEFAULT '/support-me' NOT NULL,
	"dismiss_label" text DEFAULT '' NOT NULL,
	"threshold" integer DEFAULT 3 NOT NULL,
	"starts_at" text,
	"ends_at" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_prompts_threshold_nonnegative" CHECK ("support_prompts"."threshold" >= 0)
);
--> statement-breakpoint
CREATE INDEX "idx_support_prompts_slot" ON "support_prompts" USING btree ("slot");