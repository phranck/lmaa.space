CREATE TABLE IF NOT EXISTS "rate_limit_entries" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer NOT NULL,
  "reset_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rate_limit_entries_reset_at" ON "rate_limit_entries" ("reset_at");
