import type { AdminRole } from "@lmaa/shared";
import { and, eq, gt } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { db } from "../db/index.js";
import { adminUsers, sessions } from "../db/schema.js";
import { fail } from "../lib/http.js";

/**
 * Request-scoped auth variables available after `requireAuth`.
 */
export type AuthVariables = {
  adminId: number;
  role: AdminRole;
  isOwner: boolean; // computed: role === "owner"
};

/**
 * Auth middleware validating session cookie and loading admin context.
 *
 * @returns Hono middleware that sets `adminId`, `role` and `isOwner` on context variables.
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const sessionId = getCookie(c, "session");

  if (!sessionId) {
    return fail(c, 401, "Unauthorized");
  }

  const now = new Date();
  const [session] = await db
    .select({
      adminId: sessions.adminUserId,
      role: adminUsers.role,
    })
    .from(sessions)
    .innerJoin(adminUsers, eq(sessions.adminUserId, adminUsers.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!session) {
    return fail(c, 401, "Session expired");
  }

  c.set("adminId", session.adminId);
  c.set("role", session.role as AdminRole);
  c.set("isOwner", session.role === "owner");

  await next();
});

/**
 * Auth middleware allowing only owner role.
 *
 * @returns Hono middleware rejecting non-owner users with `403`.
 */
export const requireOwner = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (!c.get("role")) return fail(c, 401, "Unauthorized");
  if (!c.get("isOwner")) {
    return fail(c, 403, "Forbidden");
  }
  await next();
});

/**
 * Auth middleware allowing owner/admin but rejecting moderators.
 *
 * @returns Hono middleware rejecting moderator users with `403`.
 */
export const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (!c.get("role")) return fail(c, 401, "Unauthorized");
  if (c.get("role") === "moderator") {
    return fail(c, 403, "Forbidden");
  }
  await next();
});
