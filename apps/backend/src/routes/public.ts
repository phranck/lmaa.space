import { createHash } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { REGION_CODES, type Shop, type ShopCategory } from "@lmaa/shared";
import { and, asc, count, eq, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { fail, ok } from "../lib/http.js";

type CategoryShopRow = Pick<
  Shop,
  "id" | "name" | "url" | "region" | "pickup" | "shipping" | "description" | "ogImage"
>;
type PublicShopRow = CategoryShopRow & { categories: ShopCategory[] };
type SearchShopRow = Shop & { categories: ShopCategory[]; rank: number };
interface CheckUrlRow {
  id: number;
  name: string;
  categories: ShopCategory[];
}
import {
  categories,
  contentPages,
  deadLinkReports,
  navItems,
  shopCategories,
  shopConcernReports,
  shops,
  submissionCategories,
  submissions,
} from "../db/schema.js";
import {
  getCacheEntry,
  getCacheStats,
  invalidateCache,
  setCacheEntry,
} from "../middleware/cache.js";
import { rateLimit } from "../middleware/rate-limit.js";

const SHOPS_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const SHOPS_CACHE_KEY = "shops:all";

const submissionSchema = z.object({
  shopName: z.string().min(2).max(100),
  shopUrl: z.string().url(),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  categorySuggestion: z.string().max(100).optional(),
  region: z.array(z.enum(REGION_CODES)).optional().default([]),
  shipping: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
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
    .leftJoin(
      shops,
      and(
        eq(shops.id, shopCategories.shopId),
        eq(shops.isActive, true),
        eq(shops.visibility, "public"),
      ),
    )
    .groupBy(categories.id)
    .orderBy(categories.name);

  c.header("Cache-Control", "private, max-age=30");
  return ok(c, rows);
});

// GET /api/stats – unique active shop count
publicRoutes.get("/stats", async (c) => {
  const [{ total }] = await db
    .select({ total: count(shops.id) })
    .from(shops)
    .where(and(eq(shops.isActive, true), eq(shops.visibility, "public")));

  c.header("Cache-Control", "public, max-age=60");
  return ok(c, { shopCount: total });
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
    return fail(c, 404, "Category not found");
  }

  const categoryShops = await db.execute<CategoryShopRow & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage"
    FROM shops s
    INNER JOIN shop_categories sc ON sc.shop_id = s.id AND sc.category_id = ${category.id}
    WHERE s.is_active = true AND s.visibility = 'public'
    ORDER BY s.name
  `);

  c.header("Cache-Control", "private, max-age=30");
  return ok(c, { ...category, shops: categoryShops });
});

// GET /api/shops
publicRoutes.get("/shops", async (c) => {
  // Check cache first
  const cached = getCacheEntry<PublicShopRow[]>(SHOPS_CACHE_KEY);
  if (cached) {
    c.header("X-Cache", "HIT");
    c.header("Cache-Control", "public, max-age=60");
    return ok(c, cached);
  }

  // Cache miss - fetch from database
  const allShops = await db.execute<PublicShopRow & Record<string, unknown>>(sql`
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
    WHERE s.is_active = true AND s.visibility = 'public'
    GROUP BY s.id
    ORDER BY s.name
  `);

  // Cache the result
  setCacheEntry(SHOPS_CACHE_KEY, allShops, SHOPS_CACHE_TTL_MS);

  c.header("X-Cache", "MISS");
  c.header("Cache-Control", "public, max-age=60");
  return ok(c, allShops);
});

// GET /api/search?q=...
publicRoutes.get("/search", async (c) => {
  const q = c.req.query("q")?.trim();

  if (!q || q.length < 2) {
    return ok(c, { shops: [], categories: [], query: q ?? "", total: 0 });
  }

  const matchingShops = await db.execute<SearchShopRow & Record<string, unknown>>(sql`
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
      AND s.is_active = true AND s.visibility = 'public'
    GROUP BY s.id
    ORDER BY rank DESC
    LIMIT 20
  `);

  const escapedQ = q.toLowerCase().replace(/[%_\\]/g, "\\$&");
  const matchingCategories = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) LIKE ${`%${escapedQ}%`} ESCAPE '\\'`)
    .limit(5);

  return ok(c, {
    shops: matchingShops,
    categories: matchingCategories,
    query: q,
    total: matchingShops.length + matchingCategories.length,
  });
});

// GET /api/check-url?url= – check if a shop with the same domain already exists
publicRoutes.get("/check-url", async (c) => {
  const url = c.req.query("url")?.trim();
  if (!url) return ok(c, { exists: false });

  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return ok(c, { exists: false });
  }

  const [match] = await db.execute<CheckUrlRow & Record<string, unknown>>(sql`
    SELECT s.id, s.name,
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) AS categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.is_active = true AND s.visibility = 'public'
      AND replace(split_part(split_part(s.url, '://', 2), '/', 1), 'www.', '') = ${hostname}
    GROUP BY s.id
    LIMIT 1
  `);

  if (!match) return ok(c, { exists: false });

  return ok(c, {
    exists: true,
    shop: { id: match.id, name: match.name, categories: match.categories },
  });
});

// POST /api/submissions
publicRoutes.post(
  "/submissions",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
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

    return ok(c, { message: "Vorschlag eingereicht" }, 201);
  },
);

// GET /api/nav/:navId
publicRoutes.get("/nav/:navId", async (c) => {
  const navId = c.req.param("navId");
  if (navId !== "header" && navId !== "footer") {
    return fail(c, 400, "Invalid navId");
  }

  const rows = await db
    .select({
      id: navItems.id,
      navId: navItems.navId,
      pageSlug: navItems.pageSlug,
      pageTitle: contentPages.title,
      url: navItems.url,
      target: navItems.target,
      label: navItems.label,
      position: navItems.position,
    })
    .from(navItems)
    .leftJoin(contentPages, eq(navItems.pageSlug, contentPages.slug))
    .where(
      and(
        eq(navItems.navId, navId),
        // only include page-based items if the page is published (URL-items always shown)
        or(eq(contentPages.status, "published"), isNull(navItems.pageSlug)),
      ),
    )
    .orderBy(asc(navItems.position));

  c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  return ok(c, rows);
});

// GET /api/content – list all published pages (slugs + titles, for SSG)
publicRoutes.get("/content", async (c) => {
  const rows = await db
    .select({ slug: contentPages.slug, title: contentPages.title })
    .from(contentPages)
    .where(eq(contentPages.status, "published"))
    .orderBy(contentPages.slug);
  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return ok(c, rows);
});

// GET /api/content/:slug  (published pages only)
publicRoutes.get("/content/:slug", async (c) => {
  const slug = c.req.param("slug");
  const [page] = await db
    .select()
    .from(contentPages)
    .where(and(eq(contentPages.slug, slug), eq(contentPages.status, "published")))
    .limit(1);
  if (!page) return fail(c, 404, "Not found");
  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return ok(c, page);
});

// POST /api/shops/:id/report – dead link report (rate limited per IP)
publicRoutes.post(
  "/shops/:id/report",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return fail(c, 400, "Invalid shop id");
    }

    const [shop] = await db
      .select({ id: shops.id, name: shops.name, url: shops.url })
      .from(shops)
      .where(eq(shops.id, id))
      .limit(1);
    if (!shop) return fail(c, 404, "Shop not found");

    const ip = c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex");

    await db.insert(deadLinkReports).values({ shopId: id, ipHash });

    const [{ reportCount }] = await db
      .select({ reportCount: count(deadLinkReports.id) })
      .from(deadLinkReports)
      .where(eq(deadLinkReports.shopId, id));

    return ok(c, { message: "Danke für deinen Hinweis!" });
  },
);

// POST /api/shops/:id/concern – shop concern report (rate limited per IP)
publicRoutes.post(
  "/shops/:id/concern",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return fail(c, 400, "Invalid shop id");
    }

    const body = await c.req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 10) {
      return fail(c, 400, "Bitte eine aussagekräftige Begründung angeben (mind. 10 Zeichen).");
    }

    const [shop] = await db
      .select({ id: shops.id, name: shops.name, url: shops.url })
      .from(shops)
      .where(eq(shops.id, id))
      .limit(1);
    if (!shop) return fail(c, 404, "Shop not found");

    const ip = c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex");

    await db.insert(shopConcernReports).values({ shopId: id, reason, ipHash });

    return ok(c, { message: "Danke für dein Feedback!" });
  },
);

// Debug endpoint: cache stats (dev only)
publicRoutes.get("/cache/stats", (c) => {
  if (env.NODE_ENV !== "development") {
    return fail(c, 404, "Not available");
  }
  return ok(c, getCacheStats());
});
