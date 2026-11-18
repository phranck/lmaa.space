CREATE TABLE "retired_sponsorship_references" (
	"reference" text PRIMARY KEY NOT NULL,
	"retired_at" timestamp DEFAULT now() NOT NULL
);
