import { zValidator } from "@hono/zod-validator";
import { createUserSchema, gravatarSchema, updateUserSchema } from "@lmaa/contracts";
import { Hono } from "hono";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin, requireOwner } from "../../middleware/auth.js";
import {
  createManagedAdminUser,
  deleteManagedAdminUser,
  deleteManagedAdminUserAvatar,
  getManagedAdminUsers,
  setManagedAdminUserGravatar,
  updateManagedAdminUser,
  uploadManagedAdminUserAvatar,
} from "../../services/admin-users.js";
/**
 * Admin user management routes (CRUD + avatar handling).
 */
export const usersRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/users
usersRoutes.get("/users", requireAdmin, async (c) => {
  const users = await getManagedAdminUsers();
  return ok(c, users);
});

// POST /api/admin/users
usersRoutes.post("/users", requireOwner, zValidator("json", createUserSchema), async (c) => {
  const { username, email, password, role, welcomeTemplateId } = c.req.valid("json");
  const user = await createManagedAdminUser({
    username,
    email,
    password,
    role,
    welcomeTemplateId,
  });
  return ok(c, user, 201);
});

// PATCH /api/admin/users/:id
usersRoutes.patch("/users/:id", zValidator("json", updateUserSchema), async (c) => {
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
usersRoutes.post("/users/:id/avatar", async (c) => {
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

  if (!result.ok) {
    if (result.reason === "forbidden") return fail(c, 403, "Forbidden");
    if (result.reason === "not_found") return fail(c, 404, "User not found");
    if (result.reason === "missing_file") return fail(c, 400, "No avatar file provided");
    if (result.reason === "too_large") return fail(c, 400, "File too large (max 5 MB)");
    return fail(c, 400, "Invalid image content (only JPEG, PNG or WebP)");
  }

  return ok(c, result.user);
});

// PATCH /api/admin/users/:id/avatar
usersRoutes.patch("/users/:id/avatar", zValidator("json", gravatarSchema), async (c) => {
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
});

// DELETE /api/admin/users/:id/avatar
usersRoutes.delete("/users/:id/avatar", async (c) => {
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
usersRoutes.delete("/users/:id", requireOwner, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) {
    return fail(c, 400, "Invalid id");
  }

  const result = await deleteManagedAdminUser({
    id,
    actorAdminId: c.get("adminId"),
    actorIsOwner: c.get("isOwner"),
  });
  if (!result.ok && result.reason === "forbidden") {
    return fail(c, 403, "Forbidden");
  }
  if (!result.ok && result.reason === "cannot_delete_self") {
    return fail(c, 400, "Cannot delete yourself");
  }

  return ok(c, { message: "User deleted" });
});
