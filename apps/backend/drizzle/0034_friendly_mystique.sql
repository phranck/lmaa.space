CREATE TABLE "shop_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"admin_id" integer NOT NULL,
	"remind_at" timestamp NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_reminders_shop_id_unique" UNIQUE("shop_id")
);
--> statement-breakpoint
ALTER TABLE "shop_reminders" ADD CONSTRAINT "shop_reminders_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_reminders" ADD CONSTRAINT "shop_reminders_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;