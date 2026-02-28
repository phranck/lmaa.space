CREATE TABLE "form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_config_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_configs" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_config_id_form_configs_id_fk" FOREIGN KEY ("form_config_id") REFERENCES "public"."form_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_configs" ADD CONSTRAINT "form_configs_slug_unique" UNIQUE("slug");