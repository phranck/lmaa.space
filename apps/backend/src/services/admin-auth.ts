import { createOwnerAdmin, getAdminProfileById } from "../repositories/admin-auth.js";
import {
  createSession,
  deleteSession,
  findAdminByUsername,
  getAdminCount,
  hashPassword,
  verifyPassword,
} from "./auth.js";

/**
 * Input payload for initial owner setup.
 */
export interface SetupAdminInput {
  username: string;
  email: string;
  password: string;
}

/**
 * Input payload for admin login.
 */
export interface LoginAdminInput {
  username: string;
  password: string;
}

/**
 * Resolves setup state for first-run onboarding.
 *
 * @returns Object with `needsSetup=true` when no admin exists yet.
 */
export async function getAdminSetupState() {
  const count = await getAdminCount();
  return { needsSetup: count === 0 };
}

/**
 * Creates the first owner account and immediately signs it in.
 *
 * @param input - Setup payload validated at route level.
 * @returns
 * - `{ ok: false, reason: "already_setup" }` when an admin already exists.
 * - `{ ok: true, sessionId, admin }` on success.
 *
 * @remarks
 * Side effects:
 * - Writes owner account to database.
 * - Hashes and stores password.
 * - Creates session row and sets last login metadata.
 */
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

/**
 * Authenticates credentials and creates a session.
 *
 * @param input - Username/password payload.
 * @returns
 * - `{ ok: false, reason: "invalid_credentials" }` for invalid auth.
 * - `{ ok: true, sessionId, admin }` when authentication succeeds.
 *
 * @remarks
 * Side effects:
 * - Creates a new session entry.
 * - Updates `lastLoginAt` via session creation.
 */
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

/**
 * Invalidates an existing session.
 *
 * @param sessionId - Session id from cookie (optional).
 * @returns Resolves when invalidation attempt completed.
 */
export async function logoutAdmin(sessionId: string | undefined) {
  if (sessionId) {
    await deleteSession(sessionId);
  }
}

/**
 * Loads profile data for the authenticated admin.
 *
 * @param adminId - Authenticated admin id from middleware context.
 * @returns Admin profile payload or `null` when not found.
 */
export async function getAdminProfile(adminId: number) {
  return getAdminProfileById(adminId);
}
