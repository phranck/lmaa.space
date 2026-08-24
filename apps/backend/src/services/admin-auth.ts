import { hashAdminInviteToken } from "./admin-invite.js";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./auth.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { failure, success } from "../lib/result.js";
import {
  acceptInviteWithSession,
  createOwnerAdminWithSession,
  createSession,
  deleteSession,
  findAdminByInviteTokenHash,
  findAdminByUsername,
  getAdminCount,
} from "../repositories/admin-auth.js";

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

interface AcceptInviteInput {
  token: string;
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
  try {
    const { admin, sessionId } = await createOwnerAdminWithSession({
      username: input.username,
      email: input.email,
      passwordHash,
    });

    return success({
      sessionId,
      admin: {
        id: admin.id,
        username: admin.username,
        locale: "de" as const,
        role: admin.role,
        isOwner: admin.role === "owner",
      },
    });
  } catch (err) {
    if (isUniqueViolation(err) && (await getAdminCount()) > 0) {
      return failure("already_setup");
    }
    throw err;
  }
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
  // Always run a bcrypt comparison — against a placeholder hash when the user is
  // unknown — so login timing does not reveal whether the username exists.
  const passwordMatches = await verifyPassword(
    input.password,
    admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!admin?.passwordHash || !passwordMatches) {
    return failure("invalid_credentials");
  }

  const sessionId = await createSession(admin.id);

  return success({
    sessionId,
    admin: {
      id: admin.id,
      username: admin.username,
      locale: admin.locale,
      role: admin.role,
      isOwner: admin.role === "owner",
      avatarUrl: admin.avatarUrl,
    },
  });
}

/**
 * Resolves invite metadata for a public password-setup screen.
 *
 * @param token - Raw invite token from URL.
 * @returns Invite identity or a typed invalid/expired failure.
 */
export async function getAdminInviteState(token: string) {
  const admin = await findAdminByInviteTokenHash(hashAdminInviteToken(token));
  if (!admin) {
    return failure("invalid_invite");
  }
  if (!admin.inviteExpiresAt || admin.inviteExpiresAt.getTime() < Date.now()) {
    return failure("expired_invite");
  }

  return success({
    username: admin.username,
    email: admin.email,
  });
}

/**
 * Accepts an invite, sets the first password and signs the user in.
 *
 * @param input - Raw invite token plus chosen password.
 * @returns Session/admin payload or invalid/expired failure.
 */
export async function acceptAdminInvite(input: AcceptInviteInput) {
  const admin = await findAdminByInviteTokenHash(hashAdminInviteToken(input.token));
  if (!admin) {
    return failure("invalid_invite");
  }
  if (!admin.inviteExpiresAt || admin.inviteExpiresAt.getTime() < Date.now()) {
    return failure("expired_invite");
  }

  const passwordHash = await hashPassword(input.password);
  const { admin: activatedAdmin, sessionId } = await acceptInviteWithSession({
    adminId: admin.id,
    passwordHash,
  });

  return success({
    sessionId,
    admin: {
      id: activatedAdmin.id,
      username: activatedAdmin.username,
      locale: activatedAdmin.locale,
      role: activatedAdmin.role,
      isOwner: activatedAdmin.role === "owner",
      avatarUrl: activatedAdmin.avatarUrl,
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
