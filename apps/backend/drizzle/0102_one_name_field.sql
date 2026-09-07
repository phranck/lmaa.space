-- Replaces the given name and the family name with one name, on the three
-- tables that describe a person the site is told about. `admin_users` keeps its
-- split: those are accounts rather than public names.
--
-- Three steps per table, because a NOT NULL column cannot be added to a table
-- that already holds rows without something to put in it. The column arrives
-- with a default, the rows are filled from what they carried, and the default is
-- then dropped so the column matches the schema, which states none.
--
-- `btrim` over both parts joined by a space handles every case the two columns
-- allow: a row carrying only one part comes out without a stray space, and one
-- carrying neither comes out empty.
ALTER TABLE "donations" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_sponsorships" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint

UPDATE "donations" SET "name" = btrim("first_name" || ' ' || "last_name");--> statement-breakpoint
UPDATE "pending_sponsorships" SET "name" = btrim("first_name" || ' ' || "last_name");--> statement-breakpoint
UPDATE "sponsors" SET "name" = btrim("first_name" || ' ' || "last_name");--> statement-breakpoint

-- Only the ledger keeps its default. A payment may be nameless, whilst a sponsor
-- and a pending sponsorship are refused without a name, so those two carry no
-- default to fall back on.
ALTER TABLE "pending_sponsorships" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sponsors" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "donations" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "donations" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "pending_sponsorships" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "pending_sponsorships" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "sponsors" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "sponsors" DROP COLUMN "last_name";
