import type { AdminUser } from "@lmaa/shared";

import {
  createAdminInviteToken,
  getAdminInviteExpiresAt,
  hashAdminInviteToken,
} from "./admin-invite.js";
import { hashPassword } from "./auth.js";
import { renderEmailTemplate } from "./email-renderer.js";
import { sendMail } from "./email.js";
import { env } from "../config/env.js";
import { processImageUpload } from "../lib/image-upload.js";
import { logger } from "../lib/logger.js";
import { failure, success } from "../lib/result.js";
import {
  type AdminUserRow,
  createAdminUser,
  deleteAdminUserAndSessions,
  getAdminUserById,
  listAdminUsers,
  updateAdminUser,
} from "../repositories/admin-users.js";
import { getEmailTemplateById } from "../repositories/email-templates.js";

function canModifyAdminUser(adminId: number, isOwner: boolean, targetId: number): boolean {
  return isOwner || adminId === targetId;
}

function toAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    isOwner: row.role === "owner",
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  };
}

/**
 * Input contract for creating an admin/moderator account.
 */
interface CreateManagedAdminUserInput {
  username: string;
  email: string;
  role?: "admin" | "moderator";
  welcomeTemplateId?: number;
}

/**
 * Input contract for updating admin/moderator profile/account fields.
 */
interface UpdateManagedAdminUserInput {
  id: number;
  actorAdminId: number;
  actorIsOwner: boolean;
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: "admin" | "moderator";
}

interface CreateManagedAdminUserResult {
  user: AdminUser;
  inviteUrl: string;
}

/**
 * Returns all admin users mapped to shared API model.
 *
 * @returns Array of normalized admin users.
 */
export async function getManagedAdminUsers(): Promise<AdminUser[]> {
  const rows = await listAdminUsers();
  return rows.map(toAdminUser);
}

/**
 * Creates a new admin/moderator user and schedules welcome email delivery.
 *
 * @param input - New user payload.
 * @returns Created user mapped to shared admin model.
 *
 * @remarks
 * Side effects:
 * - Persists invite token metadata.
 * - Sends welcome email asynchronously (non-blocking).
 */
export async function createManagedAdminUser(
  input: CreateManagedAdminUserInput,
): Promise<CreateManagedAdminUserResult> {
  const inviteToken = createAdminInviteToken();
  const inviteTokenHash = hashAdminInviteToken(inviteToken);
  const inviteExpiresAt = getAdminInviteExpiresAt();
  const inviteUrl = `${env.DASHBOARD_URL.replace(/\/$/, "")}/invite/${inviteToken}`;
  const created = await createAdminUser({
    username: input.username,
    email: input.email,
    passwordHash: null,
    inviteTokenHash,
    inviteExpiresAt,
    role: input.role ?? "admin",
  });

  if (input.welcomeTemplateId) {
    const template = await getEmailTemplateById(input.welcomeTemplateId);
    if (template) {
      const { html, subject } = await renderEmailTemplate(template, {
        username: input.username,
        role: created.role,
        loginUrl: env.DASHBOARD_URL,
        inviteUrl,
        email: input.email,
      });
      sendMail(input.email, subject, html).catch((err) => {
        logger.error({ err }, "failed to send welcome email");
      });
    }
  }

  return { user: toAdminUser(created), inviteUrl };
}

/**
 * Updates an admin user with role/self-service permission checks.
 *
 * @param input - Update payload including actor metadata.
 * @returns Result union with `ok` flag and optional reason/user payload.
 *
 * @remarks
 * Hidden rules:
 * - Non-owners cannot modify other users.
 * - Role changes require owner and cannot be self-applied.
 * - Empty payload returns `nothing_to_update`.
 */
export async function updateManagedAdminUser(input: UpdateManagedAdminUserInput) {
  if (!canModifyAdminUser(input.actorAdminId, input.actorIsOwner, input.id)) {
    return failure("forbidden");
  }

  const updates: Parameters<typeof updateAdminUser>[1] = {};
  if (input.username !== undefined) updates.username = input.username;
  if (input.email !== undefined) updates.email = input.email;
  if (input.password !== undefined) updates.passwordHash = await hashPassword(input.password);
  if (input.firstName !== undefined) updates.firstName = input.firstName;
  if (input.lastName !== undefined) updates.lastName = input.lastName;

  if (input.role !== undefined) {
    if (!input.actorIsOwner || input.actorAdminId === input.id) {
      return failure("forbidden");
    }
    updates.role = input.role;
  }

  if (Object.keys(updates).length === 0) {
    return failure("nothing_to_update");
  }

  const updated = await updateAdminUser(input.id, updates);
  if (!updated) {
    return failure("not_found");
  }

  return success({ user: toAdminUser(updated) });
}

/**
 * Uploads and stores a normalized avatar image for an admin user.
 *
 * @param input - Upload payload including actor metadata and `File`.
 * @returns Result union with `ok` flag and optional reason/user payload.
 *
 * @remarks
 * Side effects:
 * - Validates binary type using magic bytes.
 * - Resizes/crops image to 256x256 WebP.
 * - Stores image as data URL in database.
 */
export async function uploadManagedAdminUserAvatar(input: {
  id: number;
  actorAdminId: number;
  actorIsOwner: boolean;
  file: unknown;
}) {
  if (!canModifyAdminUser(input.actorAdminId, input.actorIsOwner, input.id)) {
    return failure("forbidden");
  }

  const user = await getAdminUserById(input.id);
  if (!user) {
    return failure("not_found");
  }

  const result = await processImageUpload(input.file, 256, 256);
  if (!result.ok) {
    return result;
  }

  const updated = await updateAdminUser(input.id, { avatarUrl: result.dataUrl });
  if (!updated) {
    return failure("not_found");
  }

  return success({ user: toAdminUser(updated) });
}

/**
 * Sets avatar URL to an externally provided gravatar URL.
 *
 * @param input - Actor metadata and target gravatar URL.
 * @returns Result union with `ok` flag and optional reason/user payload.
 */
export async function setManagedAdminUserGravatar(input: {
  id: number;
  actorAdminId: number;
  actorIsOwner: boolean;
  gravatarUrl: string;
}) {
  if (!canModifyAdminUser(input.actorAdminId, input.actorIsOwner, input.id)) {
    return failure("forbidden");
  }

  const updated = await updateAdminUser(input.id, { avatarUrl: input.gravatarUrl });
  if (!updated) {
    return failure("not_found");
  }

  return success({ user: toAdminUser(updated) });
}

/**
 * Removes the avatar image for an admin user.
 *
 * @param input - Actor metadata and target user id.
 * @returns Result union with `ok` flag and optional reason/user payload.
 */
export async function deleteManagedAdminUserAvatar(input: {
  id: number;
  actorAdminId: number;
  actorIsOwner: boolean;
}) {
  if (!canModifyAdminUser(input.actorAdminId, input.actorIsOwner, input.id)) {
    return failure("forbidden");
  }

  const user = await getAdminUserById(input.id);
  if (!user) {
    return failure("not_found");
  }

  const updated = await updateAdminUser(input.id, { avatarUrl: null });
  if (!updated) {
    return failure("not_found");
  }

  return success({ user: toAdminUser(updated) });
}

/**
 * Deletes another admin user and their sessions.
 *
 * @param input - Target/admin actor ids.
 * @returns Result union with `ok` flag and optional reason.
 *
 * @remarks
 * Self-deletion is explicitly disallowed to prevent accidental lock-out.
 */
export async function deleteManagedAdminUser(input: {
  id: number;
  actorAdminId: number;
  actorIsOwner: boolean;
}) {
  if (!input.actorIsOwner) {
    return failure("forbidden");
  }
  if (input.id === input.actorAdminId) {
    return failure("cannot_delete_self");
  }

  await deleteAdminUserAndSessions(input.id);
  return success();
}
