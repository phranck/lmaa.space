CREATE TABLE "shop_slugs" (
	"slug" text PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"canonical" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_slugs_format_check" CHECK (length("shop_slugs"."slug") BETWEEN 1 AND 80 AND "shop_slugs"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "shop_slugs" ADD CONSTRAINT "shop_slugs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shop_slugs_one_canonical" ON "shop_slugs" USING btree ("shop_id") WHERE "shop_slugs"."canonical" = true;--> statement-breakpoint
CREATE INDEX "idx_shop_slugs_shop" ON "shop_slugs" USING btree ("shop_id");