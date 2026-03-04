import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env.js";

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
