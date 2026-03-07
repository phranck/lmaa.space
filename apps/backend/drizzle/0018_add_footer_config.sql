CREATE TABLE "footer_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"config" jsonb DEFAULT '{"columns":[]}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "footer_config_singleton" CHECK ("id" = 1)
);

INSERT INTO "footer_config" DEFAULT VALUES ON CONFLICT DO NOTHING;
