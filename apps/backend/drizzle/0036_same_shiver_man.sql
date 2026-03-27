ALTER TABLE "shop_reminders" ADD COLUMN "recurrence_unit" text DEFAULT 'days';--> statement-breakpoint
ALTER TABLE "shop_reminders" ADD COLUMN "recurrence_days_of_week" text;