import type { AdminUser } from "@lmaa/shared";
import sharp from "sharp";
import { detectImageType } from "../lib/validate.js";
import {
  type AdminUserRow,
  createAdminUser,
  deleteAdminUserAndSessions,
  getAdminUserById,
  listAdminUsers,
  updateAdminUser,
} from "../repositories/admin-users.js";
import { hashPassword } from "./auth.js";
import { sendWelcomeEmail } from "./email.js";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

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

export interface CreateManagedAdminUserInput {
  username: string;
  email: string;
  password: string;
  role?: "admin" | "moderator";
}

export interface UpdateManagedAdminUserInput {
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

export async function getManagedAdminUsers(): Promise<AdminUser[]> {
  const rows = await listAdminUsers();
  return rows.map(toAdminUser);
}

export async function createManagedAdminUser(
  input: CreateManagedAdminUserInput,
): Promise<AdminUser> {
  const passwordHash = await hashPassword(input.password);
  const created = await createAdminUser({
    username: input.username,
    email: input.email,
    passwordHash,
    role: input.role ?? "admin",
  });

  sendWelcomeEmail(input.email, input.username, input.password).catch(() => {});

  return toAdminUser(created);
}

export async function updateManagedAdminUser(input: UpdateManagedAdminUserInput) {
  if (!canModifyAdminUser(input.actorAdminId, input.actorIsOwner, input.id)) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  const updates: Parameters<typeof updateAdminUser>[1] = {};
  if (input.username !== undefined) updates.username = input.username;
  if (input.email !== undefined) updates.email = input.email;
  if (input.password !== undefined) updates.passwordHash = await hashPassword(input.password);
  if (input.firstName !== undefined) updates.firstName = input.firstName;
  if (input.lastName !== undefined) updates.lastName = input.lastName;

  if (input.role !== undefined) {
    if (!input.actorIsOwner || input.actorAdminId === input.id) {
      return { ok: false as const, reason: "forbidden" as const };
    }
    updates.role = input.role;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false as const, reason: "nothing_to_update" as const };
  }

  const updated = await updateAdminUser(input.id, updates);
  if (!updated) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, user: toAdminUser(updated) };
}

export async function uploadManagedAdminUserAvatar(input: {
  id: number;
  actorAdminId: number;
  actorIsOwner: boolean;
  file: unknown;
}) {
  if (!canModifyAdminUser(input.actorAdminId, input.actorIsOwner, input.id)) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  const user = await getAdminUserById(input.id);
  if (!user) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (!(input.file instanceof File)) {
    return { ok: false as const, reason: "missing_file" as const };
  }

  if (input.file.size > MAX_AVATAR_SIZE_BYTES) {
    return { ok: false as const, reason: "too_large" as const };
  }

  const rawBuffer = Buffer.from(await input.file.arrayBuffer());
  const detectedType = detectImageType(rawBuffer);
  if (!detectedType) {
    return { ok: false as const, reason: "invalid_image" as const };
  }

  const resized = await sharp(rawBuffer).resize(256, 256, { fit: "cover" }).webp().toBuffer();
  const avatarUrl = `data:image/webp;base64,${resized.toString("base64")}`;

  const updated = await updateAdminUser(input.id, { avatarUrl });
  if (!updated) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, user: toAdminUser(updated) };
}

export async function setManagedAdminUserGravatar(input: {
  id: number;
  actorAdminId: number;
  actorIsOwner: boolean;
  gravatarUrl: string;
}) {
  if (!canModifyAdminUser(input.actorAdminId, input.actorIsOwner, input.id)) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  const updated = await updateAdminUser(input.id, { avatarUrl: input.gravatarUrl });
  if (!updated) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, user: toAdminUser(updated) };
}

export async function deleteManagedAdminUserAvatar(input: {
  id: number;
  actorAdminId: number;
  actorIsOwner: boolean;
}) {
  if (!canModifyAdminUser(input.actorAdminId, input.actorIsOwner, input.id)) {
    return { ok: false as const, reason: "forbidden" as const };
  }

  const user = await getAdminUserById(input.id);
  if (!user) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const updated = await updateAdminUser(input.id, { avatarUrl: null });
  if (!updated) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, user: toAdminUser(updated) };
}

export async function deleteManagedAdminUser(input: { id: number; actorAdminId: number }) {
  if (input.id === input.actorAdminId) {
    return { ok: false as const, reason: "cannot_delete_self" as const };
  }

  await deleteAdminUserAndSessions(input.id);
  return { ok: true as const };
}
