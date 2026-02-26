import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";
import {
  createManagedAdminCategory,
  deleteManagedAdminCategory,
  getAdminCategories,
  removeManagedAdminCategoryImage,
  updateManagedAdminCategory,
  uploadManagedAdminCategoryImage,
} from "../../services/admin-categories.js";

const categoryBodySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  icon: z.string().max(10).optional(),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
  imageUrl: z.string().url().nullable().optional(),
  imagePhotographer: z.string().max(200).nullable().optional(),
  imagePhotographerUrl: z.string().url().nullable().optional(),
});

const categoryUpdateSchema = categoryBodySchema.partial();

export const categoriesRoutes = new Hono<{ Variables: AuthVariables }>();

categoriesRoutes.get("/categories", requireAuth, async (c) => {
  const rows = await getAdminCategories();
  return ok(c, rows);
});

categoriesRoutes.post(
  "/categories",
  requireAuth,
  zValidator("json", categoryBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const category = await createManagedAdminCategory(body);
    return ok(c, category, 201);
  },
);

for (const method of ["put", "patch"] as const) {
  categoriesRoutes[method](
    "/categories/:id",
    requireAuth,
    zValidator("json", categoryUpdateSchema),
    async (c) => {
      const id = parseId(c.req.param("id"));
      if (!id) return fail(c, 400, "Invalid id");
      const body = c.req.valid("json");

      const category = await updateManagedAdminCategory(id, body);
      if (!category) return fail(c, 404, "Category not found");
      return ok(c, category);
    },
  );
}

categoriesRoutes.delete("/categories/:id", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  await deleteManagedAdminCategory(id);
  return ok(c, { message: "Category deleted" });
});

// Image upload for a category
categoriesRoutes.post("/categories/:id/image", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const formData = await c.req.formData();
  const file = formData.get("image");

  const result = await uploadManagedAdminCategoryImage(id, file);
  if (!result.ok && result.reason === "not_found") return fail(c, 404, "Category not found");
  if (!result.ok && result.reason === "missing_file") return fail(c, 400, "No image file provided");
  if (!result.ok && result.reason === "too_large") return fail(c, 400, "File too large (max 5 MB)");
  if (!result.ok && result.reason === "invalid_image")
    return fail(c, 400, "Invalid image content (only JPEG, PNG or WebP)");

  return ok(c, result.category);
});

// Delete image of a category
categoriesRoutes.delete("/categories/:id/image", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const result = await removeManagedAdminCategoryImage(id);
  if (!result.ok) return fail(c, 404, "Category not found");

  return ok(c, result.category);
});
