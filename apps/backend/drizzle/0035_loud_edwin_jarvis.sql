ALTER TABLE "shop_reminders" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_reminders" ADD COLUMN "recurrence" text DEFAULT 'never' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_reminders" ADD COLUMN "recurrence_custom_days" integer;