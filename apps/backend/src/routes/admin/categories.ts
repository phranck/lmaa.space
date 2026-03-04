import { zValidator } from "@hono/zod-validator";
import { categoryBodySchema, categoryUpdateSchema } from "@lmaa/contracts";
import { Hono } from "hono";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
} from "../../repositories/admin-categories.js";
import {
  removeManagedAdminCategoryImage,
  uploadManagedAdminCategoryImage,
} from "../../services/admin-categories.js";

/**
 * Admin category CRUD routes.
 *
 * Includes create/update/delete plus image upload and image removal endpoints.
 */
export const categoriesRoutes = new Hono<{ Variables: AuthVariables }>();

categoriesRoutes.get("/categories", async (c) => {
  const rows = await listAdminCategories();
  return ok(c, rows);
});

categoriesRoutes.post("/categories", zValidator("json", categoryBodySchema), async (c) => {
  const body = c.req.valid("json");
  const category = await createAdminCategory(body);
  return ok(c, category, 201);
});

const updateCategoryHandler = zValidator("json", categoryUpdateSchema);

categoriesRoutes.put("/categories/:id", updateCategoryHandler, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const body = c.req.valid("json");
  const category = await updateAdminCategory(id, body);
  if (!category) return fail(c, 404, "Category not found");
  return ok(c, category);
});

categoriesRoutes.patch("/categories/:id", updateCategoryHandler, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const body = c.req.valid("json");
  const category = await updateAdminCategory(id, body);
  if (!category) return fail(c, 404, "Category not found");
  return ok(c, category);
});

categoriesRoutes.delete("/categories/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  await deleteAdminCategory(id);
  return ok(c, { message: "Category deleted" });
});

// Image upload for a category
categoriesRoutes.post("/categories/:id/image", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const formData = await c.req.formData();
  const file = formData.get("image");

  const result = await uploadManagedAdminCategoryImage(id, file);
  if (!result.ok) {
    if (result.reason === "not_found") return fail(c, 404, "Category not found");
    if (result.reason === "missing_file") return fail(c, 400, "No image file provided");
    if (result.reason === "too_large") return fail(c, 400, "File too large (max 5 MB)");
    return fail(c, 400, "Invalid image content (only JPEG, PNG or WebP)");
  }

  return ok(c, result.category);
});

// Delete image of a category
categoriesRoutes.delete("/categories/:id/image", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const result = await removeManagedAdminCategoryImage(id);
  if (!result.ok) return fail(c, 404, "Category not found");

  return ok(c, result.category);
});
