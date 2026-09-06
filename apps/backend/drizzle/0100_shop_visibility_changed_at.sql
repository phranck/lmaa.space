ALTER TABLE "shops" ADD COLUMN "visibility_changed_at" timestamp;
--> statement-breakpoint
-- Gives every shop that is not public the closest thing to the moment it left
-- public view. Nothing recorded that moment, so `updated_at` is what is left:
-- it is the same figure the dashboard has been showing as the deletion date,
-- and freezing it here stops a later edit moving it again.
--
-- Public shops stay null on purpose. Their admission is `created_at`, which the
-- reader falls back to, and writing that into this column would claim a state
-- change that never happened.
UPDATE "shops" SET "visibility_changed_at" = "updated_at" WHERE "visibility" <> 'public';
