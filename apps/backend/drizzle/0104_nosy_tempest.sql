SELECT pg_advisory_xact_lock(46102027);--> statement-breakpoint
DELETE FROM "shop_slugs" WHERE "canonical" = false;--> statement-breakpoint
DROP INDEX "idx_shop_slugs_one_canonical";--> statement-breakpoint
DROP INDEX "idx_shop_slugs_shop";--> statement-breakpoint
ALTER TABLE "shop_slugs" ALTER COLUMN "canonical" SET DEFAULT true;--> statement-breakpoint
CREATE UNIQUE INDEX "shop_slugs_shop_id_unique" ON "shop_slugs" USING btree ("shop_id");--> statement-breakpoint
ALTER TABLE "shop_slugs" ADD CONSTRAINT "shop_slugs_canonical_check" CHECK ("shop_slugs"."canonical" = true);