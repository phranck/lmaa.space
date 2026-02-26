import { zValidator } from "@hono/zod-validator";
import type { Shop, ShopCategory, ShopSummary } from "@lmaa/shared";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/index.js";
import { adminUsers, deadLinkReports, shopCategories, shops } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
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
  const visibilityFilter = c.req.query("visibility");
  const rows = await db.execute<ShopSummary & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region,
           s.visibility,
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
    ${visibilityFilter ? sql`WHERE s.visibility = ${visibilityFilter}` : sql``}
    GROUP BY s.id, u.username
    ORDER BY s.name
  `);
  return ok(c, rows);
});

shopsRoutes.get("/shops/:id", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
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
  if (!row) return fail(c, 404, "Shop not found");
  return ok(c, row);
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

  return ok(c, { ...shop, categories: [] }, 201);
});

for (const method of ["put", "patch"] as const) {
  shopsRoutes[method](
    "/shops/:id",
    requireAuth,
    zValidator("json", shopUpdateSchema),
    async (c) => {
      const id = parseId(c.req.param("id"));
      if (!id) return fail(c, 400, "Invalid id");
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

      if (!shop) return fail(c, 404, "Shop not found");

      // Invalidate cache
      invalidateCache(SHOPS_CACHE_KEY);

      return ok(c, { ...shop, categories: [] });
    },
  );
}

shopsRoutes.delete("/shops/:id", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const body = await c.req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;
  const wasReported = typeof body?.wasReported === "boolean" ? body.wasReported : false;
  const mode = body?.mode === "delete" ? "delete" : "mark_deleted";

  const [existing] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, id));
  if (!existing) return fail(c, 404, "Shop not found");

  if (mode === "delete") {
    await db.transaction(async (tx) => {
      await tx.delete(deadLinkReports).where(eq(deadLinkReports.shopId, id));
      await tx.delete(shops).where(eq(shops.id, id));
    });
  } else {
    const adminId = c.get("adminId");
    await db
      .update(shops)
      .set({
        visibility: "deleted",
        deletedBy: adminId ?? null,
        deleteReason: reason,
        deletedWasReported: wasReported,
        updatedAt: new Date(),
      })
      .where(eq(shops.id, id));

    await db.delete(deadLinkReports).where(eq(deadLinkReports.shopId, id));
  }

  invalidateCache(SHOPS_CACHE_KEY);
  return ok(c, { message: mode === "delete" ? "Shop permanently deleted" : "Shop marked deleted" });
});

// PATCH /admin/shops/:id/visibility — set public or onhold (use DELETE for deleted)
shopsRoutes.patch("/shops/:id/visibility", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const body = await c.req.json().catch(() => ({}));
  const { visibility } = body;
  if (!["public", "onhold"].includes(visibility)) {
    return fail(c, 400, "Use 'public' or 'onhold'; for deleting use DELETE");
  }

  await db
    .update(shops)
    .set({
      visibility,
      deletedBy: null,
      deleteReason: null,
      deletedWasReported: false,
      updatedAt: new Date(),
    })
    .where(eq(shops.id, id));

  invalidateCache(SHOPS_CACHE_KEY);
  return ok(c, { message: `Shop visibility set to ${visibility}` });
});

shopsRoutes.post("/shops/:id/refetch-image", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const [shop] = await db.select({ url: shops.url }).from(shops).where(eq(shops.id, id));
  if (!shop) return fail(c, 404, "Shop not found");

  const result = await fetchPreviewImage(extractHomepage(shop.url));
  const ogImage = result?.url ?? null;
  await db.update(shops).set({ ogImage }).where(eq(shops.id, id));

  return ok(c, { ogImage });
});

shopsRoutes.post(
  "/preview-image",
  requireAuth,
  zValidator("json", previewImageSchema),
  async (c) => {
    const { url } = c.req.valid("json");
    const result = await fetchPreviewImage(extractHomepage(url));
    return ok(c, { ogImage: result?.url ?? null });
  },
);
