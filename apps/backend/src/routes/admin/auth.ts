import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";

import { acceptInviteSchema, loginSchema, setupSchema } from "@lmaa/contracts";

import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import { adminUsers } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { getAdminProfileById } from "../../repositories/admin-auth.js";
import {
  acceptAdminInvite,
  getAdminInviteState,
  getAdminSetupState,
  loginAdmin,
  logoutAdmin,
  setupOwnerAdmin,
} from "../../services/admin-auth.js";
import { SESSION_COOKIE_OPTIONS } from "../../services/auth.js";

/**
 * Admin authentication routes (`/setup`, `/login`, `/logout`, `/me`).
 *
 * Hidden behavior: successful setup/login writes the `session` cookie using
 * shared secure cookie options.
 */
export const authRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/setup – check if initial setup is needed
// Disabled in production: initial setup is complete.
authRoutes.get("/setup", async (c) => {
  if (env.NODE_ENV === "production") return fail(c, 403, "Setup disabled");
  const state = await getAdminSetupState();
  return ok(c, state);
});

// Invite routes are public by necessity, since an invite has to be redeemable
// without an account. Guessing a token is not the concern (32 random bytes,
// stored as a SHA-256 hash), but every call runs a query, and these were the
// only public routes here without a limit.
const inviteLookupLimit = rateLimit({ max: 30, windowMs: 15 * 60 * 1000 });
const inviteAcceptLimit = rateLimit({ max: 10, windowMs: 15 * 60 * 1000 });

// GET /api/admin/invite/:token – validate invite link and resolve metadata
authRoutes.get("/invite/:token", inviteLookupLimit, async (c) => {
  const token = c.req.param("token");
  const result = await getAdminInviteState(token);

  if (!result.ok && result.reason === "invalid_invite") {
    return fail(c, 404, "Invite link is invalid");
  }
  if (!result.ok && result.reason === "expired_invite") {
    return fail(c, 410, "Invite link has expired");
  }

  return ok(c, {
    username: result.username,
    email: result.email,
  });
});

// POST /api/admin/setup (only if no admin exists)
// Disabled in production: initial setup is complete.
authRoutes.post("/setup", async (c) => {
  if (env.NODE_ENV === "production") return fail(c, 403, "Setup disabled");

  const parsed = setupSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "Validation failed");

  const { username, email, password } = parsed.data;
  const result = await setupOwnerAdmin({ username, email, password });

  if (!result.ok) {
    return fail(c, 403, "Setup already completed");
  }

  setCookie(c, "session", result.sessionId, SESSION_COOKIE_OPTIONS);
  return ok(c, result.admin, 201);
});

// POST /api/admin/login
authRoutes.post(
  "/login",
  rateLimit({ max: 10, windowMs: 15 * 60 * 1000 }),
  zValidator("json", loginSchema),
  async (c) => {
    const { username, password } = c.req.valid("json");
    const result = await loginAdmin({ username, password });

    if (!result.ok) {
      return fail(c, 401, "Invalid credentials");
    }

    setCookie(c, "session", result.sessionId, SESSION_COOKIE_OPTIONS);
    return ok(c, result.admin);
  },
);

// POST /api/admin/invite/accept
authRoutes.post(
  "/invite/accept",
  inviteAcceptLimit,
  zValidator("json", acceptInviteSchema),
  async (c) => {
    const { token, password } = c.req.valid("json");
    const result = await acceptAdminInvite({ token, password });

    if (!result.ok && result.reason === "invalid_invite") {
      return fail(c, 404, "Invite link is invalid");
    }
    if (!result.ok && result.reason === "expired_invite") {
      return fail(c, 410, "Invite link has expired");
    }

    setCookie(c, "session", result.sessionId, SESSION_COOKIE_OPTIONS);
    return ok(c, result.admin);
  },
);

// POST /api/admin/logout
authRoutes.post("/logout", requireAuth, async (c) => {
  const sessionId = getCookie(c, "session");
  await logoutAdmin(sessionId);
  deleteCookie(c, "session", { path: "/" });
  return ok(c, { message: "Logged out" });
});

// GET /api/admin/me
authRoutes.get("/me", requireAuth, async (c) => {
  const adminId = c.get("adminId");
  const admin = await getAdminProfileById(adminId);
  if (!admin) {
    return fail(c, 404, "Admin user not found");
  }

  return ok(c, { ...admin, isOwner: admin.role === "owner" });
});

const uiPreferencesSchema = z.object({
  sidebarSectionOrder: z.array(z.string()).optional(),
});

// PATCH /api/admin/me/preferences
authRoutes.patch(
  "/me/preferences",
  requireAuth,
  zValidator("json", uiPreferencesSchema),
  async (c) => {
    const adminId = c.get("adminId");
    const prefs = c.req.valid("json");
    await db.update(adminUsers).set({ uiPreferences: prefs }).where(eq(adminUsers.id, adminId));
    return ok(c, null);
  },
);
