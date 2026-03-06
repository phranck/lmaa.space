ALTER TABLE "shops" DROP CONSTRAINT IF EXISTS "shops_visibility_check";--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "rejection_token" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "rejection_long_text" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_single_owner_idx" ON "admin_users" USING btree ("role") WHERE "admin_users"."role" = 'owner';--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "shops" ADD CONSTRAINT "shops_rejection_token_unique" UNIQUE("rejection_token");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "shops" ADD CONSTRAINT "shops_visibility_check" CHECK ("shops"."visibility" IN ('public', 'onhold', 'deleted', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
