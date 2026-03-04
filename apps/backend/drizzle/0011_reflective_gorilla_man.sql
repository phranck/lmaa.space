DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'dead_link_reports_shop_id_fkey' AND table_name = 'dead_link_reports') THEN
    ALTER TABLE "dead_link_reports" DROP CONSTRAINT "dead_link_reports_shop_id_fkey";
  ELSIF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'dead_link_reports_shop_id_shops_id_fk' AND table_name = 'dead_link_reports') THEN
    ALTER TABLE "dead_link_reports" DROP CONSTRAINT "dead_link_reports_shop_id_shops_id_fk";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "dead_link_reports" ADD CONSTRAINT "dead_link_reports_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_shops_visibility" ON "shops" USING btree ("visibility");