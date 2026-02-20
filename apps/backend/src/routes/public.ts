import { zValidator } from "@hono/zod-validator";
import { count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { categories, shops, submissions } from "../db/schema.js";
import { rateLimit } from "../middleware/rate-limit.js";

const submissionSchema = z.object({
  shopName: z.string().min(2).max(100),
  shopUrl: z.string().url(),
  categoryId: z.number().int().positive().optional(),
  categorySuggestion: z.string().max(100).optional(),
  description: z.string().max(200).optional(),
  submitterEmail: z.string().email().optional(),
  submitterNote: z.string().max(500).optional(),
});

export const publicRoutes = new Hono();

// GET /api/categories
publicRoutes.get("/categories", async (c) => {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      sortOrder: categories.sortOrder,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
      shopCount: count(shops.id),
    })
    .from(categories)
    .leftJoin(shops, eq(shops.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return c.json({ data: rows });
});

// GET /api/categories/:slug
publicRoutes.get("/categories/:slug", async (c) => {
  const slug = c.req.param("slug");

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (!category) {
    return c.json({ error: { message: "Category not found" } }, 404);
  }

  const categoryShops = await db
    .select()
    .from(shops)
    .where(eq(shops.categoryId, category.id))
    .orderBy(shops.name);

  return c.json({ data: { ...category, shops: categoryShops } });
});

// GET /api/shops
publicRoutes.get("/shops", async (c) => {
  const allShops = await db
    .select({
      id: shops.id,
      name: shops.name,
      url: shops.url,
      categoryId: shops.categoryId,
      categorySlug: categories.slug,
      categoryName: categories.name,
      region: shops.region,
      pickup: shops.pickup,
      shipping: shops.shipping,
      description: shops.description,
      createdAt: shops.createdAt,
      updatedAt: shops.updatedAt,
    })
    .from(shops)
    .innerJoin(categories, eq(shops.categoryId, categories.id))
    .where(eq(shops.isActive, true))
    .orderBy(shops.name);

  return c.json({ data: allShops });
});

// GET /api/search?q=...
publicRoutes.get("/search", async (c) => {
  const q = c.req.query("q")?.trim();

  if (!q || q.length < 2) {
    return c.json({ data: { shops: [], categories: [], query: q ?? "", total: 0 } });
  }

  const ftsQuery = `${q}*`;

  const matchingShops = await db.all(sql`
    SELECT s.*, c.slug as category_slug, c.name as category_name
    FROM shops_fts fts
    JOIN shops s ON s.id = fts.rowid
    JOIN categories c ON c.id = s.category_id
    WHERE shops_fts MATCH ${ftsQuery}
    AND s.is_active = 1
    ORDER BY bm25(shops_fts)
    LIMIT 20
  `);

  const matchingCategories = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) LIKE ${"%" + q.toLowerCase() + "%"}`)
    .limit(5);

  return c.json({
    data: {
      shops: matchingShops,
      categories: matchingCategories,
      query: q,
      total: (matchingShops as unknown[]).length + matchingCategories.length,
    },
  });
});

// POST /api/submissions
publicRoutes.post(
  "/submissions",
  rateLimit({ max: 5, windowMs: 60 * 60 * 1000 }),
  zValidator("json", submissionSchema),
  async (c) => {
    const body = c.req.valid("json");

    await db.insert(submissions).values({
      shopName: body.shopName,
      shopUrl: body.shopUrl,
      categoryId: body.categoryId ?? null,
      categorySuggestion: body.categorySuggestion ?? null,
      description: body.description ?? "",
      submitterEmail: body.submitterEmail ?? null,
      submitterNote: body.submitterNote ?? null,
    });

    return c.json({ data: { message: "Vorschlag eingereicht" } }, 201);
  },
);
