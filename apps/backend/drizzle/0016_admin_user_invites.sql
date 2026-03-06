ALTER TABLE "admin_users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "admin_users" ADD COLUMN "invite_token_hash" text;
ALTER TABLE "admin_users" ADD COLUMN "invite_expires_at" timestamp;
CREATE UNIQUE INDEX "admin_users_invite_token_idx"
  ON "admin_users" ("invite_token_hash")
  WHERE "invite_token_hash" IS NOT NULL;
