import { eq } from "drizzle-orm";

import type { AdminUserRow } from "./admin-users.js";
import { db } from "../db/index.js";
import { adminUsers, sessions } from "../db/schema.js";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Payload used to create the first owner account during setup.
 */
interface CreateOwnerAdminInput {
  username: string;
  email: string;
  passwordHash: string;
}

/**
 * Creates the initial owner account and first session atomically.
 *
 * @param input - Setup payload with unique username/email and pre-hashed password.
 * @returns Newly created admin identity together with a persisted session id.
 */
export async function createOwnerAdminWithSession(input: CreateOwnerAdminInput) {
  return db.transaction(async (tx) => {
    const [admin] = await tx
      .insert(adminUsers)
      .values({
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        isOwner: true,
        role: "owner",
      })
      .returning({
        id: adminUsers.id,
        username: adminUsers.username,
        role: adminUsers.role,
      });

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await tx.insert(sessions).values({ id: sessionId, adminUserId: admin.id, expiresAt });
    await tx.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));

    return { admin, sessionId };
  });
}

/**
 * Resolves an admin profile by numeric id.
 *
 * @param adminId - Persistent id from the authenticated session.
 * @returns Profile row when the user still exists, otherwise `null`.
 */
export async function getAdminProfileById(adminId: number): Promise<AdminUserRow | null> {
  const [admin] = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      role: adminUsers.role,
      firstName: adminUsers.firstName,
      lastName: adminUsers.lastName,
      avatarUrl: adminUsers.avatarUrl,
      createdAt: adminUsers.createdAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  return admin ?? null;
}

/**
 * Creates a new admin session and updates the admin's last login timestamp.
 *
 * @param adminUserId - Existing admin user id.
 * @returns A newly generated session id (`UUID`).
 */
export async function createSession(adminUserId: number): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({ id: sessionId, adminUserId, expiresAt });

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
