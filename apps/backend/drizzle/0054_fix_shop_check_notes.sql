ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "shop_check_notes" jsonb;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "shop_check_notes" jsonb;
