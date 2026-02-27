import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import {
  type AuthVariables,
  requireAdmin,
  requireAuth,
  requireOwner,
} from "../../middleware/auth.js";
import {
  createManagedAdminUser,
  deleteManagedAdminUser,
  deleteManagedAdminUserAvatar,
  getManagedAdminUsers,
  setManagedAdminUserGravatar,
  updateManagedAdminUser,
  uploadManagedAdminUserAvatar,
} from "../../services/admin-users.js";
import { setupSchema } from "../../services/auth.js";

/**
 * Admin user management routes (CRUD + avatar handling).
 */
export const usersRoutes = new Hono<{ Variables: AuthVariables }>();

const createUserSchema = setupSchema.extend({
  role: z.enum(["admin", "moderator"]).optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(1).max(64).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().max(64).optional(),
  lastName: z.string().max(64).optional(),
  role: z.enum(["admin", "moderator"]).optional(),
});

const gravatarSchema = z.object({
  gravatarUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://www.gravatar.com/avatar/"), "Must be a Gravatar URL"),
});

// GET /api/admin/users
usersRoutes.get("/users", requireAuth, requireAdmin, async (c) => {
  const users = await getManagedAdminUsers();
  return ok(c, users);
});

// POST /api/admin/users
usersRoutes.post(
  "/users",
  requireAuth,
  requireOwner,
  zValidator("json", createUserSchema),
  async (c) => {
    const { username, email, password, role } = c.req.valid("json");
    const user = await createManagedAdminUser({ username, email, password, role });
    return ok(c, user, 201);
  },
);

// PATCH /api/admin/users/:id
usersRoutes.patch("/users/:id", requireAuth, zValidator("json", updateUserSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) {
    return fail(c, 400, "Invalid id");
  }

  const result = await updateManagedAdminUser({
    id,
    actorAdminId: c.get("adminId"),
    actorIsOwner: c.get("isOwner"),
    ...c.req.valid("json"),
  });

  if (!result.ok && result.reason === "forbidden") {
    return fail(c, 403, "Forbidden");
  }
  if (!result.ok && result.reason === "nothing_to_update") {
    return fail(c, 400, "Nothing to update");
  }
  if (!result.ok && result.reason === "not_found") {
    return fail(c, 404, "User not found");
  }

  return ok(c, result.user);
});

// POST /api/admin/users/:id/avatar
usersRoutes.post("/users/:id/avatar", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) {
    return fail(c, 400, "Invalid id");
  }

  const formData = await c.req.formData();
  const file = formData.get("avatar");

  const result = await uploadManagedAdminUserAvatar({
    id,
    actorAdminId: c.get("adminId"),
    actorIsOwner: c.get("isOwner"),
    file,
  });

  if (!result.ok && result.reason === "forbidden") {
    return fail(c, 403, "Forbidden");
  }
  if (!result.ok && result.reason === "not_found") {
    return fail(c, 404, "User not found");
  }
  if (!result.ok && result.reason === "missing_file") {
    return fail(c, 400, "No avatar file provided");
  }
  if (!result.ok && result.reason === "too_large") {
    return fail(c, 400, "File too large (max 5 MB)");
  }
  if (!result.ok && result.reason === "invalid_image") {
    return fail(c, 400, "Invalid image content (only JPEG, PNG or WebP)");
  }

  return ok(c, result.user);
});

// PATCH /api/admin/users/:id/avatar
usersRoutes.patch(
  "/users/:id/avatar",
  requireAuth,
  zValidator("json", gravatarSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) {
      return fail(c, 400, "Invalid id");
    }

    const { gravatarUrl } = c.req.valid("json");
    const result = await setManagedAdminUserGravatar({
      id,
      actorAdminId: c.get("adminId"),
      actorIsOwner: c.get("isOwner"),
      gravatarUrl,
    });

    if (!result.ok && result.reason === "forbidden") {
      return fail(c, 403, "Forbidden");
    }
    if (!result.ok && result.reason === "not_found") {
      return fail(c, 404, "User not found");
    }

    return ok(c, result.user);
  },
);

// DELETE /api/admin/users/:id/avatar
usersRoutes.delete("/users/:id/avatar", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) {
    return fail(c, 400, "Invalid id");
  }

  const result = await deleteManagedAdminUserAvatar({
    id,
    actorAdminId: c.get("adminId"),
    actorIsOwner: c.get("isOwner"),
  });

  if (!result.ok && result.reason === "forbidden") {
    return fail(c, 403, "Forbidden");
  }
  if (!result.ok && result.reason === "not_found") {
    return fail(c, 404, "User not found");
  }

  return ok(c, result.user);
});

// DELETE /api/admin/users/:id
usersRoutes.delete("/users/:id", requireAuth, requireOwner, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) {
    return fail(c, 400, "Invalid id");
  }

  const result = await deleteManagedAdminUser({ id, actorAdminId: c.get("adminId") });
  if (!result.ok && result.reason === "cannot_delete_self") {
    return fail(c, 400, "Cannot delete yourself");
  }

  return ok(c, { message: "User deleted" });
});
