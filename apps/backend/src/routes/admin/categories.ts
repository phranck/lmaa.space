import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { categoryCreateSchema, categoryUpdateSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  deleteAdminCategory,
  listAdminCategories,
  setAdminCategoryFocalPoint,
  updateAdminCategory,
} from "../../repositories/admin-categories.js";
import {
  createCategoryWithPosts,
  removeManagedAdminCategoryImage,
  setManagedAdminCategoryUnsplashImage,
  uploadManagedAdminCategoryImage,
} from "../../services/admin-categories.js";

function isDuplicateSlug(e: unknown): boolean {
  return e instanceof Error && e.message.includes("categories_slug_key");
}

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

categoriesRoutes.post("/categories", zValidator("json", categoryCreateSchema), async (c) => {
  const body = c.req.valid("json");
  const adminId = c.get("adminId");
  try {
    const category = await createCategoryWithPosts({ ...body, adminId });
    return ok(c, category, 201);
  } catch (e: unknown) {
    if (isDuplicateSlug(e)) {
      return fail(c, 409, `Eine Kategorie mit dem Slug '${body.slug}' existiert bereits.`);
    }
    throw e;
  }
});

const updateCategoryHandler = zValidator("json", categoryUpdateSchema);

categoriesRoutes.put("/categories/:id", updateCategoryHandler, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const body = c.req.valid("json");
  try {
    const category = await updateAdminCategory(id, body);
    if (!category) return fail(c, 404, "Category not found");
    return ok(c, category);
  } catch (e: unknown) {
    if (isDuplicateSlug(e)) {
      return fail(c, 409, `Eine Kategorie mit dem Slug '${body.slug}' existiert bereits.`);
    }
    throw e;
  }
});

categoriesRoutes.patch("/categories/:id", updateCategoryHandler, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const body = c.req.valid("json");
  try {
    const category = await updateAdminCategory(id, body);
    if (!category) return fail(c, 404, "Category not found");
    return ok(c, category);
  } catch (e: unknown) {
    if (isDuplicateSlug(e)) {
      return fail(c, 409, `Eine Kategorie mit dem Slug '${body.slug}' existiert bereits.`);
    }
    throw e;
  }
});

categoriesRoutes.delete("/categories/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  await deleteAdminCategory(id);
  return ok(c, { message: "Category deleted" });
});

const unsplashImageSchema = z.object({
  unsplashId: z.string().min(1),
  url: z.string().url(),
  urlSmall: z.string().url(),
  photographer: z.string().min(1),
  photographerUrl: z.string().url(),
  downloadLocation: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  color: z.string().nullable(),
  blurHash: z.string().nullable(),
  description: z.string().nullable(),
  altDescription: z.string().nullable(),
  likes: z.number().int(),
  createdAt: z.string(),
});

// Set Unsplash image on a category (upserts unsplash_images, sets FK, caches)
categoriesRoutes.post(
  "/categories/:id/unsplash-image",
  requireAdmin,
  zValidator("json", unsplashImageSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");

    const body = c.req.valid("json");
    const result = await setManagedAdminCategoryUnsplashImage(id, body);
    if (!result.ok) return fail(c, 404, "Category not found");

    return ok(c, result.category);
  },
);

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

// Update focal point
const focalPointSchema = z.object({
  focalPointY: z.number().int().min(0).max(100),
});

categoriesRoutes.patch(
  "/categories/:id/focal-point",
  requireAdmin,
  zValidator("json", focalPointSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");
    const { focalPointY } = c.req.valid("json");
    const category = await setAdminCategoryFocalPoint(id, Math.max(0, Math.min(100, Math.round(focalPointY))));
    if (!category) return fail(c, 404, "Category not found");
    return ok(c, category);
  },
);

// Delete image of a category
categoriesRoutes.delete("/categories/:id/image", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const result = await removeManagedAdminCategoryImage(id);
  if (!result.ok) return fail(c, 404, "Category not found");

  return ok(c, result.category);
});
