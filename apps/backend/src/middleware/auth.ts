import { createMiddleware } from "hono/factory";
import { db } from "../db/index.js";
import { sessions, adminUsers } from "../db/schema.js";
import { eq, gt } from "drizzle-orm";

export type AuthVariables = {
  adminId: number;
  isOwner: boolean;
};

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const sessionId = c.req.header("Cookie")?.match(/session=([^;]+)/)?.[1];

    if (!sessionId) {
      return c.json({ error: { message: "Unauthorized" } }, 401);
    }

    const now = new Date().toISOString();
    const [session] = await db
      .select({
        adminId: sessions.adminUserId,
        expiresAt: sessions.expiresAt,
        isOwner: adminUsers.isOwner,
      })
      .from(sessions)
      .innerJoin(adminUsers, eq(sessions.adminUserId, adminUsers.id))
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session || session.expiresAt < now) {
      return c.json({ error: { message: "Session expired" } }, 401);
    }

    c.set("adminId", session.adminId);
    c.set("isOwner", session.isOwner);

    await next();
  },
);

export const requireOwner = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    if (!c.get("isOwner")) {
      return c.json({ error: { message: "Forbidden" } }, 403);
    }
    await next();
  },
);
