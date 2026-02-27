import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { adminUsers, sessions } from "../db/schema.js";

/**
 * Validation schema for the initial owner setup payload.
 *
 * @remarks
 * This schema is consumed by route-layer validation before calling service methods.
 * It does not create users itself.
 */
export const setupSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Default cookie settings for admin session handling.
 *
 * @remarks
 * These values are designed for server-managed auth cookies:
 * - `httpOnly` prevents JavaScript access.
 * - `secure` is enabled in production.
 * - `sameSite: "Strict"` limits CSRF surface.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "Strict" as const,
  maxAge: 86400,
  path: "/",
};

/**
 * Hashes a plaintext password with bcrypt.
 *
 * @param password - Plain user-provided password.
 * @returns A bcrypt hash string suitable for persistence.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 *
 * @param password - Plain user-provided password.
 * @param hash - Persisted bcrypt hash.
 * @returns `true` when the password matches the hash; otherwise `false`.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a new admin session and updates the admin's last login timestamp.
 *
 * @param adminUserId - Existing admin user id.
 * @returns A newly generated session id (`UUID`).
 *
 * @remarks
 * Side effects:
 * - Inserts one row into `sessions`.
 * - Updates `admin_users.last_login_at`.
 */
export async function createSession(adminUserId: number): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({ id: sessionId, adminUserId, expiresAt });

  // Update last login
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, adminUserId));

  return sessionId;
}

/**
 * Deletes a persisted session.
 *
 * @param sessionId - Session identifier from cookie/store.
 * @returns Resolves when deletion finished (no-op for unknown ids).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Counts all admin users.
 *
 * @returns Total row count of `admin_users`.
 */
export async function getAdminCount(): Promise<number> {
  const result = await db.$count(adminUsers);
  return result;
}

/**
 * Finds one admin by username.
 *
 * @param username - Unique admin username.
 * @returns Matching admin row; `null` if none exists.
 */
export async function findAdminByUsername(username: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);
  return admin ?? null;
}
