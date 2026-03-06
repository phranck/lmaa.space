import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { acceptInviteSchema, loginSchema, setupSchema } from "@lmaa/contracts";

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
authRoutes.get("/setup", async (c) => {
  const state = await getAdminSetupState();
  return ok(c, state);
});

// GET /api/admin/invite/:token – validate invite link and resolve metadata
authRoutes.get("/invite/:token", async (c) => {
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
authRoutes.post("/setup", zValidator("json", setupSchema), async (c) => {
  const { username, email, password } = c.req.valid("json");
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
authRoutes.post("/invite/accept", zValidator("json", acceptInviteSchema), async (c) => {
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
});

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
