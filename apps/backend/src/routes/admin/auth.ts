import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { db } from "../../db/index.js";
import { adminUsers } from "../../db/schema.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import {
  SESSION_COOKIE_OPTIONS,
  createSession,
  deleteSession,
  findAdminByUsername,
  getAdminCount,
  hashPassword,
  setupSchema,
  verifyPassword,
} from "../../services/auth.js";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/setup – check if initial setup is needed
authRoutes.get("/setup", async (c) => {
  const count = await getAdminCount();
  return c.json({ needsSetup: count === 0 });
});

// POST /api/admin/setup (only if no admin exists)
authRoutes.post("/setup", zValidator("json", setupSchema), async (c) => {
  const adminCount = await getAdminCount();
  if (adminCount > 0) {
    return c.json({ error: { message: "Setup already completed" } }, 403);
  }

  const { username, email, password } = c.req.valid("json");
  const passwordHash = await hashPassword(password);

  const [admin] = await db
    .insert(adminUsers)
    .values({ username, email, passwordHash, role: "owner" })
    .returning();

  const sessionId = await createSession(admin.id);
  setCookie(c, "session", sessionId, SESSION_COOKIE_OPTIONS);

  return c.json({ data: { id: admin.id, username: admin.username, role: "owner", isOwner: true } }, 201);
});

// POST /api/admin/login
authRoutes.post(
  "/login",
  rateLimit({ max: 10, windowMs: 15 * 60 * 1000 }),
  zValidator("json", loginSchema),
  async (c) => {
    const { username, password } = c.req.valid("json");
    const admin = await findAdminByUsername(username);

    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      return c.json({ error: { message: "Invalid credentials" } }, 401);
    }

    const sessionId = await createSession(admin.id);
    setCookie(c, "session", sessionId, SESSION_COOKIE_OPTIONS);

    return c.json({
      data: { id: admin.id, username: admin.username, role: admin.role, isOwner: admin.role === "owner" },
    });
  },
);

// POST /api/admin/logout
authRoutes.post("/logout", requireAuth, async (c) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) await deleteSession(sessionId);
  deleteCookie(c, "session", { path: "/" });
  return c.json({ data: { message: "Logged out" } });
});

// GET /api/admin/me
authRoutes.get("/me", requireAuth, async (c) => {
  const adminId = c.get("adminId");
  const [admin] = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      role: adminUsers.role,
      firstName: adminUsers.firstName,
      lastName: adminUsers.lastName,
      avatarUrl: adminUsers.avatarUrl,
      createdAt: adminUsers.createdAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  return c.json({ data: { ...admin, isOwner: admin.role === "owner" } });
});
