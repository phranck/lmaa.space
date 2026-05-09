CREATE TABLE "shop_likes" (
	"shop_id" integer NOT NULL,
	"visitor_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_likes_shop_id_visitor_key_pk" PRIMARY KEY("shop_id","visitor_key")
);
--> statement-breakpoint
ALTER TABLE "shop_likes" ADD CONSTRAINT "shop_likes_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_shop_likes_visitor" ON "shop_likes" USING btree ("visitor_key");