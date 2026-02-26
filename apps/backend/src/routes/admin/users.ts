import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import sharp from "sharp";
import { z } from "zod";
import { db } from "../../db/index.js";
import { adminUsers, sessions } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
import { detectImageType, parseId } from "../../lib/validate.js";
import {
  type AuthVariables,
  requireAdmin,
  requireAuth,
  requireOwner,
} from "../../middleware/auth.js";
import { hashPassword, setupSchema } from "../../services/auth.js";
import { sendWelcomeEmail } from "../../services/email.js";

export const usersRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── Helper ───────────────────────────────────────────────────────────────────

const USER_FIELDS = {
  id: adminUsers.id,
  username: adminUsers.username,
  email: adminUsers.email,
  role: adminUsers.role,
  firstName: adminUsers.firstName,
  lastName: adminUsers.lastName,
  avatarUrl: adminUsers.avatarUrl,
  createdAt: adminUsers.createdAt,
  lastLoginAt: adminUsers.lastLoginAt,
};

/** Returns true if the requester may modify the target user. */
function canModify(adminId: number, isOwner: boolean, targetId: number): boolean {
  return isOwner || adminId === targetId;
}

// ─── List users (admin+) ──────────────────────────────────────────────────────

usersRoutes.get("/users", requireAuth, requireAdmin, async (c) => {
  const users = await db.select(USER_FIELDS).from(adminUsers);
  return ok(
    c,
    users.map((u) => ({ ...u, isOwner: u.role === "owner" })),
  );
});

// ─── Create user (owner only) ─────────────────────────────────────────────────

const createUserSchema = setupSchema.extend({
  role: z.enum(["admin", "moderator"]).optional(),
});

usersRoutes.post(
  "/users",
  requireAuth,
  requireOwner,
  zValidator("json", createUserSchema),
  async (c) => {
    const { username, email, password, role } = c.req.valid("json");
    const passwordHash = await hashPassword(password);
    const [admin] = await db
      .insert(adminUsers)
      .values({ username, email, passwordHash, role: role ?? "admin" })
      .returning(USER_FIELDS);

    // Send welcome email (fire-and-forget, don't block the response)
    sendWelcomeEmail(email, username, password).catch(() => {});

    return ok(c, { ...admin, isOwner: admin.role === "owner" }, 201);
  },
);

// ─── Update user profile (self or owner) ─────────────────────────────────────

const updateUserSchema = z.object({
  username: z.string().min(1).max(64).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().max(64).optional(),
  lastName: z.string().max(64).optional(),
  role: z.enum(["admin", "moderator"]).optional(),
});

usersRoutes.patch("/users/:id", requireAuth, zValidator("json", updateUserSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const adminId = c.get("adminId");
  const isOwner = c.get("isOwner");
  if (!canModify(adminId, isOwner, id)) {
    return fail(c, 403, "Forbidden");
  }

  const { username, email, password, firstName, lastName, role } = c.req.valid("json");
  const updates: Partial<typeof adminUsers.$inferInsert> = {};
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (password !== undefined) updates.passwordHash = await hashPassword(password);
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;

  if (role !== undefined) {
    if (!isOwner || adminId === id) {
      return fail(c, 403, "Forbidden");
    }
    updates.role = role;
  }

  if (Object.keys(updates).length === 0) {
    return fail(c, 400, "Nothing to update");
  }

  const [updated] = await db
    .update(adminUsers)
    .set(updates)
    .where(eq(adminUsers.id, id))
    .returning(USER_FIELDS);

  return ok(c, { ...updated, isOwner: updated.role === "owner" });
});

// ─── Upload avatar (self or owner) ───────────────────────────────────────────

usersRoutes.post("/users/:id/avatar", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const adminId = c.get("adminId");
  const isOwner = c.get("isOwner");
  if (!canModify(adminId, isOwner, id)) {
    return fail(c, 403, "Forbidden");
  }

  const [user] = await db
    .select(USER_FIELDS)
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  if (!user) return fail(c, 404, "User not found");

  const formData = await c.req.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) return fail(c, 400, "No avatar file provided");

  if (file.size > 5 * 1024 * 1024) {
    return fail(c, 400, "File too large (max 5 MB)");
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageType(rawBuffer);
  if (!detectedType) {
    return fail(c, 400, "Invalid image content (only JPEG, PNG or WebP)");
  }

  // Resize to 256x256 cover, convert to WebP, store as base64 data URL in DB
  const resized = await sharp(rawBuffer).resize(256, 256, { fit: "cover" }).webp().toBuffer();
  const avatarUrl = `data:image/webp;base64,${resized.toString("base64")}`;

  const [updated] = await db
    .update(adminUsers)
    .set({ avatarUrl })
    .where(eq(adminUsers.id, id))
    .returning(USER_FIELDS);

  return ok(c, { ...updated, isOwner: updated.role === "owner" });
});

// ─── Set Gravatar as avatar (self or owner) ───────────────────────────────────

const gravatarSchema = z.object({
  gravatarUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://www.gravatar.com/avatar/"), "Must be a Gravatar URL"),
});

usersRoutes.patch(
  "/users/:id/avatar",
  requireAuth,
  zValidator("json", gravatarSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");

    const adminId = c.get("adminId");
    const isOwner = c.get("isOwner");
    if (!canModify(adminId, isOwner, id)) {
      return fail(c, 403, "Forbidden");
    }

    const { gravatarUrl } = c.req.valid("json");

    const [updated] = await db
      .update(adminUsers)
      .set({ avatarUrl: gravatarUrl })
      .where(eq(adminUsers.id, id))
      .returning(USER_FIELDS);

    return ok(c, { ...updated, isOwner: updated.role === "owner" });
  },
);

// ─── Delete avatar (self or owner) ───────────────────────────────────────────

usersRoutes.delete("/users/:id/avatar", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const adminId = c.get("adminId");
  const isOwner = c.get("isOwner");
  if (!canModify(adminId, isOwner, id)) {
    return fail(c, 403, "Forbidden");
  }

  const [user] = await db
    .select({ avatarUrl: adminUsers.avatarUrl })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  if (!user) return fail(c, 404, "User not found");

  const [updated] = await db
    .update(adminUsers)
    .set({ avatarUrl: null })
    .where(eq(adminUsers.id, id))
    .returning(USER_FIELDS);

  return ok(c, { ...updated, isOwner: updated.role === "owner" });
});

// ─── Delete user (owner only) ─────────────────────────────────────────────────

usersRoutes.delete("/users/:id", requireAuth, requireOwner, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const adminId = c.get("adminId");

  if (id === adminId) {
    return fail(c, 400, "Cannot delete yourself");
  }

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.adminUserId, id));
    await tx.delete(adminUsers).where(eq(adminUsers.id, id));
  });
  return ok(c, { message: "User deleted" });
});
