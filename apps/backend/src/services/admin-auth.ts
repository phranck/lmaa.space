import { createOwnerAdmin, getAdminProfileById } from "../repositories/admin-auth.js";
import {
  createSession,
  deleteSession,
  findAdminByUsername,
  getAdminCount,
  hashPassword,
  verifyPassword,
} from "./auth.js";

export interface SetupAdminInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginAdminInput {
  username: string;
  password: string;
}

export async function getAdminSetupState() {
  const count = await getAdminCount();
  return { needsSetup: count === 0 };
}

export async function setupOwnerAdmin(input: SetupAdminInput) {
  const adminCount = await getAdminCount();
  if (adminCount > 0) {
    return { ok: false as const, reason: "already_setup" as const };
  }

  const passwordHash = await hashPassword(input.password);
  const admin = await createOwnerAdmin({
    username: input.username,
    email: input.email,
    passwordHash,
  });

  const sessionId = await createSession(admin.id);

  return {
    ok: true as const,
    sessionId,
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      isOwner: admin.role === "owner",
    },
  };
}

export async function loginAdmin(input: LoginAdminInput) {
  const admin = await findAdminByUsername(input.username);
  if (!admin || !(await verifyPassword(input.password, admin.passwordHash))) {
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  const sessionId = await createSession(admin.id);

  return {
    ok: true as const,
    sessionId,
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      isOwner: admin.role === "owner",
    },
  };
}

export async function logoutAdmin(sessionId: string | undefined) {
  if (sessionId) {
    await deleteSession(sessionId);
  }
}

export async function getAdminProfile(adminId: number) {
  return getAdminProfileById(adminId);
}
