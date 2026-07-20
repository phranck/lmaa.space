ALTER TABLE "shops" ADD COLUMN "payment_methods" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "payment_methods" jsonb DEFAULT '[]'::jsonb NOT NULL;