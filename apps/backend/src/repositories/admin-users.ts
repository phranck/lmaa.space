import type { AdminRole } from "@lmaa/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { adminUsers, sessions } from "../db/schema.js";

/**
 * Shared select projection for admin user responses.
 */
const ADMIN_USER_FIELDS = {
  id: adminUsers.id,
  username: adminUsers.username,
  email: adminUsers.email,
  role: adminUsers.role,
  firstName: adminUsers.firstName,
  lastName: adminUsers.lastName,
  avatarUrl: adminUsers.avatarUrl,
  createdAt: adminUsers.createdAt,
  lastLoginAt: adminUsers.lastLoginAt,
};

/**
 * Admin user projection exposed to dashboard services.
 */
export type AdminUserRow = {
  id: number;
  username: string;
  email: string;
  role: AdminRole;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
};

/**
 * Payload for creating admin/moderator accounts.
 */
export interface CreateAdminUserInput {
  username: string;
  email: string;
  passwordHash: string;
  role: Extract<AdminRole, "admin" | "moderator">;
}

/**
 * Mutable user fields for profile and role updates.
 */
export type UpdateAdminUserInput = Partial<{
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Extract<AdminRole, "admin" | "moderator">;
  avatarUrl: string | null;
}>;

/**
 * Lists all admin users.
 *
 * @returns Array of admin user rows.
 */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  return db.select(ADMIN_USER_FIELDS).from(adminUsers);
}

/**
 * Finds one admin user by id.
 *
 * @param id - User id.
 * @returns User row or `null` when not found.
 */
export async function getAdminUserById(id: number): Promise<AdminUserRow | null> {
  const [row] = await db
    .select(ADMIN_USER_FIELDS)
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Creates one admin user row.
 *
 * @param input - Validated create payload with hashed password.
 * @returns Newly persisted admin user.
 */
export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUserRow> {
  const [row] = await db.insert(adminUsers).values(input).returning(ADMIN_USER_FIELDS);
  return row;
}

/**
 * Updates one admin user by id.
 *
 * @param id - User id.
 * @param input - Partial update payload.
 * @returns Updated user or `null` if no row matched.
 */
export async function updateAdminUser(
  id: number,
  input: UpdateAdminUserInput,
): Promise<AdminUserRow | null> {
  const [row] = await db
    .update(adminUsers)
    .set(input)
    .where(eq(adminUsers.id, id))
    .returning(ADMIN_USER_FIELDS);

  return row ?? null;
}

/**
 * Deletes an admin user and all associated sessions in one transaction.
 *
 * @param id - User id to remove.
 * @returns Resolves when both tables are cleaned up.
 */
export async function deleteAdminUserAndSessions(id: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.adminUserId, id));
    await tx.delete(adminUsers).where(eq(adminUsers.id, id));
  });
}
