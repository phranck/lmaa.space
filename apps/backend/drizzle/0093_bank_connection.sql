CREATE TABLE "bank_authorization_states" (
	"state" text PRIMARY KEY NOT NULL,
	"authorization_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"account_uid" text NOT NULL,
	"aspsp_name" text DEFAULT '' NOT NULL,
	"aspsp_country" text DEFAULT '' NOT NULL,
	"consent_valid_until" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_bank_authorization_states_expires_at" ON "bank_authorization_states" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bank_connections_one_live" ON "bank_connections" USING btree (("revoked_at" IS NULL)) WHERE "bank_connections"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_bank_connections_created_at" ON "bank_connections" USING btree ("created_at");