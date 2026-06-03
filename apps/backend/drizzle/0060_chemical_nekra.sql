CREATE TABLE "social_preview_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"composition" jsonb NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_preview_projects" ADD CONSTRAINT "social_preview_projects_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_social_preview_projects_created_at" ON "social_preview_projects" USING btree ("created_at");