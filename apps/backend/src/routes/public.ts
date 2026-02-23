import { createHash } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { and, count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  categories,
  contentPages,
  deadLinkReports,
  shopCategories,
  shops,
  submissionCategories,
  submissions,
} from "../db/schema.js";
import { rateLimit } from "../middleware/rate-limit.js";

const submissionSchema = z.object({
  shopName: z.string().min(2).max(100),
  shopUrl: z.string().url(),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  categorySuggestion: z.string().max(100).optional(),
  region: z
    .array(z.enum(["DE", "AT", "CH", "EU"]))
    .optional()
    .default([]),
  shipping: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
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
      imageUrl: categories.imageUrl,
      shopCount: count(shops.id),
    })
    .from(categories)
    .leftJoin(shopCategories, eq(shopCategories.categoryId, categories.id))
    .leftJoin(shops, and(eq(shops.id, shopCategories.shopId), eq(shops.isActive, true)))
    .groupBy(categories.id)
    .orderBy(categories.name);

  c.header("Cache-Control", "private, max-age=30");
  return c.json({ data: rows });
});

// GET /api/categories/:slug
publicRoutes.get("/categories/:slug", async (c) => {
  const slug = c.req.param("slug");

  const [category] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      imageUrl: categories.imageUrl,
    })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (!category) {
    return c.json({ error: { message: "Category not found" } }, 404);
  }

  const categoryShops = await db.execute(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage"
    FROM shops s
    INNER JOIN shop_categories sc ON sc.shop_id = s.id AND sc.category_id = ${category.id}
    WHERE s.is_active = true
    ORDER BY s.name
  `);

  c.header("Cache-Control", "private, max-age=30");
  return c.json({ data: { ...category, shops: categoryShops } });
});

// GET /api/shops
publicRoutes.get("/shops", async (c) => {
  const allShops = await db.execute(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.is_active = true
    GROUP BY s.id
    ORDER BY s.name
  `);

  c.header("Cache-Control", "private, max-age=60");
  return c.json({ data: allShops });
});

// GET /api/search?q=...
publicRoutes.get("/search", async (c) => {
  const q = c.req.query("q")?.trim();

  if (!q || q.length < 2) {
    return c.json({ data: { shops: [], categories: [], query: q ?? "", total: 0 } });
  }

  const matchingShops = await db.execute(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage", s.is_active as "isActive",
           s.created_at as "createdAt", s.updated_at as "updatedAt",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories,
           ts_rank(s.search_vector, websearch_to_tsquery('german', ${q})) as rank
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.search_vector @@ websearch_to_tsquery('german', ${q})
      AND s.is_active = true
    GROUP BY s.id
    ORDER BY rank DESC
    LIMIT 20
  `);

  const matchingCategories = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) LIKE ${`%${q.toLowerCase()}%`}`)
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

// GET /api/check-url?url= – check if a shop with the same domain already exists
publicRoutes.get("/check-url", async (c) => {
  const url = c.req.query("url")?.trim();
  if (!url) return c.json({ data: { exists: false } });

  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return c.json({ data: { exists: false } });
  }

  const [match] = await db.execute(sql`
    SELECT s.id, s.name,
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) AS categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.is_active = true
      AND replace(split_part(split_part(s.url, '://', 2), '/', 1), 'www.', '') = ${hostname}
    GROUP BY s.id
    LIMIT 1
  `);

  if (!match) return c.json({ data: { exists: false } });

  return c.json({
    data: {
      exists: true,
      shop: { id: match.id, name: match.name, categories: match.categories },
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

    const [submission] = await db
      .insert(submissions)
      .values({
        shopName: body.shopName,
        shopUrl: body.shopUrl,
        categorySuggestion: body.categorySuggestion ?? null,
        region: body.region,
        shipping: body.shipping ?? "",
        description: body.description ?? "",
        submitterEmail: body.submitterEmail ?? null,
        submitterNote: body.submitterNote ?? null,
      })
      .returning();

    if (body.categoryIds.length > 0) {
      await db
        .insert(submissionCategories)
        .values(body.categoryIds.map((cid) => ({ submissionId: submission.id, categoryId: cid })));
    }

    return c.json({ data: { message: "Vorschlag eingereicht" } }, 201);
  },
);

// GET /api/content/:slug
publicRoutes.get("/content/:slug", async (c) => {
  const slug = c.req.param("slug");
  const [page] = await db.select().from(contentPages).where(eq(contentPages.slug, slug)).limit(1);
  if (!page) return c.json({ error: { message: "Not found" } }, 404);
  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return c.json({ data: page });
});

// POST /api/shops/:id/report – dead link report (rate limited per IP)
publicRoutes.post(
  "/shops/:id/report",
  rateLimit({ max: 3, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: { message: "Invalid shop id" } }, 400);
    }

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, id)).limit(1);
    if (!shop) return c.json({ error: { message: "Shop not found" } }, 404);

    const ip = c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex");

    await db.insert(deadLinkReports).values({ shopId: id, ipHash });

    return c.json({ data: { message: "Danke für deinen Hinweis!" } });
  },
);
