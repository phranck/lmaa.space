import { failure, success } from "../lib/result.js";
import {
  createOwnerAdmin,
  createSession,
  deleteSession,
  findAdminByUsername,
  getAdminCount,
} from "../repositories/admin-auth.js";
import { hashPassword, verifyPassword } from "./auth.js";

/**
 * Input payload for initial owner setup.
 */
interface SetupAdminInput {
  username: string;
  email: string;
  password: string;
}

/**
 * Input payload for admin login.
 */
interface LoginAdminInput {
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
    return failure("already_setup");
  }

  const passwordHash = await hashPassword(input.password);
  const admin = await createOwnerAdmin({
    username: input.username,
    email: input.email,
    passwordHash,
  });

  const sessionId = await createSession(admin.id);

  return success({
    sessionId,
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      isOwner: admin.role === "owner",
    },
  });
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
    return failure("invalid_credentials");
  }

  const sessionId = await createSession(admin.id);

  return success({
    sessionId,
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      isOwner: admin.role === "owner",
      avatarUrl: admin.avatarUrl,
    },
  });
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
