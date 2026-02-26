import { zValidator } from "@hono/zod-validator";
import { count, eq, getTableColumns } from "drizzle-orm";
import { Hono } from "hono";
import sharp from "sharp";
import { z } from "zod";
import { db } from "../../db/index.js";
import { categories, shopCategories, shops } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
import { detectImageType, parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";

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
  const rows = await db
    .select({ ...getTableColumns(categories), shopCount: count(shops.id) })
    .from(categories)
    .leftJoin(shopCategories, eq(shopCategories.categoryId, categories.id))
    .leftJoin(shops, eq(shops.id, shopCategories.shopId))
    .groupBy(categories.id)
    .orderBy(categories.name);
  return ok(c, rows);
});

categoriesRoutes.post(
  "/categories",
  requireAuth,
  zValidator("json", categoryBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const [category] = await db.insert(categories).values(body).returning();
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

      const [category] = await db
        .update(categories)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning();
      if (!category) return fail(c, 404, "Category not found");
      return ok(c, category);
    },
  );
}

categoriesRoutes.delete("/categories/:id", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  await db.delete(categories).where(eq(categories.id, id));
  return ok(c, { message: "Category deleted" });
});

// Image upload for a category
categoriesRoutes.post("/categories/:id/image", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return fail(c, 404, "Category not found");

  const formData = await c.req.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) return fail(c, 400, "No image file provided");

  if (file.size > 5 * 1024 * 1024) return fail(c, 400, "File too large (max 5 MB)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageType(buffer);
  if (!detectedType) return fail(c, 400, "Invalid image content (only JPEG, PNG or WebP)");

  // Resize to 1200x675 (16:9), convert to WebP, store as base64 data URL in DB
  const resized = await sharp(buffer).resize(1200, 675, { fit: "cover" }).webp().toBuffer();
  const imageUrl = `data:image/webp;base64,${resized.toString("base64")}`;
  const [updated] = await db
    .update(categories)
    .set({ imageUrl, imagePhotographer: null, imagePhotographerUrl: null, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();

  return ok(c, updated);
});

// Delete image of a category
categoriesRoutes.delete("/categories/:id/image", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return fail(c, 404, "Category not found");

  const [updated] = await db
    .update(categories)
    .set({
      imageUrl: null,
      imagePhotographer: null,
      imagePhotographerUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return ok(c, updated);
});
