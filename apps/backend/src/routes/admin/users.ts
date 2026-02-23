import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/index.js";
import { adminUsers, sessions } from "../../db/schema.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAuth, requireOwner } from "../../middleware/auth.js";
import { hashPassword, setupSchema } from "../../services/auth.js";

export const usersRoutes = new Hono<{ Variables: AuthVariables }>();

// Admin user management (owner only)
usersRoutes.get("/users", requireAuth, requireOwner, async (c) => {
  const users = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      isOwner: adminUsers.isOwner,
      createdAt: adminUsers.createdAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers);
  return c.json({ data: users });
});

usersRoutes.post(
  "/users",
  requireAuth,
  requireOwner,
  zValidator("json", setupSchema),
  async (c) => {
    const { username, email, password } = c.req.valid("json");
    const passwordHash = await hashPassword(password);
    const [admin] = await db
      .insert(adminUsers)
      .values({ username, email, passwordHash })
      .returning();
    return c.json({ data: { id: admin.id, username: admin.username, email: admin.email } }, 201);
  },
);

usersRoutes.delete("/users/:id", requireAuth, requireOwner, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  const adminId = c.get("adminId");

  if (id === adminId) {
    return c.json({ error: { message: "Cannot delete yourself" } }, 400);
  }

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.adminUserId, id));
    await tx.delete(adminUsers).where(eq(adminUsers.id, id));
  });
  return c.json({ data: { message: "User deleted" } });
});
