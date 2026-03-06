import { createHash, randomBytes } from "node:crypto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Creates a URL-safe invite token for password setup links.
 */
export function createAdminInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes invite tokens before persistence.
 */
export function hashAdminInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Computes the expiration timestamp for a new invite.
 */
export function getAdminInviteExpiresAt(): Date {
  return new Date(Date.now() + INVITE_TTL_MS);
}
