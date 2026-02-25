import { zValidator } from "@hono/zod-validator";
import type { Shop, ShopCategory, ShopSummary } from "@lmaa/shared";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/index.js";
import { deadLinkReports, shopCategories, shops, adminUsers } from "../../db/schema.js";
import { extractHomepage, fetchPreviewImage } from "../../lib/og.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";
import { invalidateCache } from "../../middleware/cache.js";

const SHOPS_CACHE_KEY = "shops:all";

type AdminShopDetail = Shop & { categories: ShopCategory[] };

const shopBodySchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  region: z
    .array(z.enum(["DE", "AT", "CH", "EU"]))
    .optional()
    .default([]),
  pickup: z.string().optional(),
  shipping: z.string().optional(),
  description: z.string().max(2000).optional(),
});

const shopUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  region: z.array(z.enum(["DE", "AT", "CH", "EU"])).optional(),
  pickup: z.string().optional(),
  shipping: z.string().optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

const previewImageSchema = z.object({ url: z.string().url() });

export const shopsRoutes = new Hono<{ Variables: AuthVariables }>();

shopsRoutes.get("/shops", requireAuth, async (c) => {
  const includeDeleted = c.req.query("includeDeleted") === "true";
  const rows = await db.execute<ShopSummary & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region,
           s.deleted_at as "deletedAt",
           s.delete_reason as "deleteReason",
           s.deleted_was_reported as "deletedWasReported",
           u.username as "deletedByUsername",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    LEFT JOIN admin_users u ON u.id = s.deleted_by
    ${includeDeleted ? sql`` : sql`WHERE s.deleted_at IS NULL`}
    GROUP BY s.id, u.username
    ORDER BY s.name
  `);
  return c.json({ data: rows });
});

shopsRoutes.get("/shops/:id", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  const [row] = await db.execute<AdminShopDetail & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage", s.is_active as "isActive",
           s.created_at as "createdAt", s.updated_at as "updatedAt",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.id = ${id}
    GROUP BY s.id
  `);
  if (!row) return c.json({ error: { message: "Shop not found" } }, 404);
  return c.json({ data: row });
});

shopsRoutes.post("/shops", requireAuth, zValidator("json", shopBodySchema), async (c) => {
  const { categoryIds, ...shopData } = c.req.valid("json");

  const shop = await db.transaction(async (tx) => {
    const [s] = await tx.insert(shops).values(shopData).returning();
    if (categoryIds.length > 0) {
      await tx
        .insert(shopCategories)
        .values(categoryIds.map((cid) => ({ shopId: s.id, categoryId: cid })));
    }
    return s;
  });

  // Invalidate cache
  invalidateCache(SHOPS_CACHE_KEY);

  fetchPreviewImage(shop.url)
    .then(async (result) => {
      if (result) {
        await db.update(shops).set({ ogImage: result.url }).where(eq(shops.id, shop.id));
      }
    })
    .catch(() => {});

  return c.json({ data: { ...shop, categories: [] } }, 201);
});

for (const method of ["put", "patch"] as const) {
  shopsRoutes[method](
    "/shops/:id",
    requireAuth,
    zValidator("json", shopUpdateSchema),
    async (c) => {
      const id = parseId(c.req.param("id"));
      if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
      const { categoryIds, ...shopData } = c.req.valid("json");

      const shop = await db.transaction(async (tx) => {
        const [s] = await tx
          .update(shops)
          .set({ ...shopData, updatedAt: new Date() })
          .where(eq(shops.id, id))
          .returning();
        if (!s) return null;

        if (categoryIds !== undefined) {
          await tx.delete(shopCategories).where(eq(shopCategories.shopId, id));
          if (categoryIds.length > 0) {
            await tx
              .insert(shopCategories)
              .values(categoryIds.map((cid) => ({ shopId: id, categoryId: cid })));
          }
        }

        return s;
      });

      if (!shop) return c.json({ error: { message: "Shop not found" } }, 404);

      // Invalidate cache
      invalidateCache(SHOPS_CACHE_KEY);

      return c.json({ data: { ...shop, categories: [] } });
    },
  );
}

shopsRoutes.delete("/shops/:id", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);

  const body = await c.req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;
  const wasReported = typeof body?.wasReported === "boolean" ? body.wasReported : false;

  const adminId = c.get("adminId");

  await db.update(shops).set({
    deletedAt: new Date(),
    deletedBy: adminId ?? null,
    deleteReason: reason,
    deletedWasReported: wasReported,
  }).where(eq(shops.id, id));

  invalidateCache(SHOPS_CACHE_KEY);
  return c.json({ data: { message: "Shop deleted" } });
});

shopsRoutes.post("/shops/:id/refetch-image", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);

  const [shop] = await db.select({ url: shops.url }).from(shops).where(eq(shops.id, id));
  if (!shop) return c.json({ error: { message: "Shop not found" } }, 404);

  const result = await fetchPreviewImage(extractHomepage(shop.url));
  const ogImage = result?.url ?? null;
  await db.update(shops).set({ ogImage }).where(eq(shops.id, id));

  return c.json({ data: { ogImage } });
});

shopsRoutes.post(
  "/preview-image",
  requireAuth,
  zValidator("json", previewImageSchema),
  async (c) => {
    const { url } = c.req.valid("json");
    const result = await fetchPreviewImage(extractHomepage(url));
    return c.json({ data: { ogImage: result?.url ?? null } });
  },
);
