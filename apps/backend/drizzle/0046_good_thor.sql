CREATE TABLE "background_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" integer
);
--> statement-breakpoint
ALTER TABLE "background_errors" ADD CONSTRAINT "background_errors_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_background_errors_source" ON "background_errors" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_background_errors_unresolved" ON "background_errors" USING btree ("occurred_at") WHERE "background_errors"."resolved_at" IS NULL;