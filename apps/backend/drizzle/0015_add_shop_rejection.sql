ALTER TABLE "shops" ADD COLUMN "rejection_token" text;
ALTER TABLE "shops" ADD COLUMN "rejection_long_text" text;
ALTER TABLE "shops" ADD CONSTRAINT "shops_rejection_token_unique" UNIQUE("rejection_token");
ALTER TABLE "shops" DROP CONSTRAINT IF EXISTS "shops_visibility_check";
ALTER TABLE "shops" ADD CONSTRAINT "shops_visibility_check" CHECK (visibility IN ('public', 'onhold', 'deleted', 'rejected'));
