ALTER TABLE "shop_reminders" ADD COLUMN "send_email" boolean DEFAULT true NOT NULL;
ALTER TABLE "shop_reminders" ADD COLUMN "email_template_id" integer;
ALTER TABLE "shop_reminders" ADD CONSTRAINT "shop_reminders_email_template_id_email_templates_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;

CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;
