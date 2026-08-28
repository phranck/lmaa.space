ALTER TABLE "shops" ADD COLUMN "submission_id" integer;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_submission_id_unique" UNIQUE("submission_id");