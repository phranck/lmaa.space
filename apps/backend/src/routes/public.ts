import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "../config/env.js";
import { fail, ok } from "../lib/http.js";
import { rateLimit, resolveClientIp } from "../middleware/rate-limit.js";
import {
  getManagedPublicFormConfig,
  getManagedPublicFormConfigBySlug,
} from "../services/admin-form-config.js";
import { executeSubmissionChain } from "../services/form-submission.js";
import { buildFormValidationSchema } from "../services/form-validation.js";
import {
  checkManagedPublicShopUrl,
  createManagedDeadLinkReport,
  createManagedShopConcernReport,
  getManagedPublicCacheStats,
  getManagedPublicCategories,
  getManagedPublicCategoryBySlug,
  getManagedPublicContentPageBySlug,
  getManagedPublicContentPages,
  getManagedPublicNavItems,
  getManagedPublicRejectionPageByToken,
  getManagedPublicShops,
  getManagedPublicStats,
  searchManagedPublicCatalog,
} from "../services/public.js";

/**
 * Public API routes consumed by the website and external clients.
 */
export const publicRoutes = new Hono();

const publicReadLimit = rateLimit({ max: 100, windowMs: 60 * 1000 });
const concernBodySchema = z.object({ reason: z.string().min(1) });

// GET /api/categories
publicRoutes.get("/categories", publicReadLimit, async (c) => {
  const rows = await getManagedPublicCategories();
  c.header("Cache-Control", "private, max-age=30");
  return ok(c, rows);
});

// GET /api/stats – unique active shop count
publicRoutes.get("/stats", publicReadLimit, async (c) => {
  const stats = await getManagedPublicStats();
  c.header("Cache-Control", "public, max-age=60");
  return ok(c, stats);
});

// GET /api/categories/:slug
publicRoutes.get("/categories/:slug", publicReadLimit, async (c) => {
  const result = await getManagedPublicCategoryBySlug(c.req.param("slug"));
  if (!result.ok) {
    return fail(c, 404, "Category not found");
  }

  c.header("Cache-Control", "private, max-age=30");
  return ok(c, result.data);
});

// GET /api/shops
publicRoutes.get("/shops", publicReadLimit, async (c) => {
  const result = await getManagedPublicShops();
  c.header("X-Cache", result.cache);
  c.header("Cache-Control", "public, max-age=60");
  return ok(c, result.data);
});

// GET /api/search?q=...
publicRoutes.get("/search", publicReadLimit, async (c) => {
  const result = await searchManagedPublicCatalog(c.req.query("q"));
  return ok(c, result);
});

// GET /api/check-url?url= – check if a shop with the same domain already exists
publicRoutes.get("/check-url", publicReadLimit, async (c) => {
  const result = await checkManagedPublicShopUrl(c.req.query("url"));
  return ok(c, result);
});

// POST /api/form/:slug/submit — generic form submission
publicRoutes.post(
  "/form/:slug/submit",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const slug = c.req.param("slug");
    const rawData = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!rawData) return fail(c, 400, "Invalid JSON body");

    const result = await getManagedPublicFormConfigBySlug(slug);
    if (!result.ok || !result.data.isActive) return fail(c, 404, "Not found");
    if (!result.data.submissionConfig) return fail(c, 400, "No submission config");

    const schema = buildFormValidationSchema(result.data.rows);
    const parsed = schema.safeParse(rawData);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      c.status(400);
      return c.json({ error: { message: "Validation failed", issues } });
    }

    await executeSubmissionChain(result.data.submissionConfig, parsed.data, result.data);
    return ok(c, { message: "OK" }, 201);
  },
);

// GET /api/nav/:navId
publicRoutes.get("/nav/:navId", publicReadLimit, async (c) => {
  const navId = c.req.param("navId");
  if (navId !== "header" && navId !== "footer") {
    return fail(c, 400, "Invalid navId");
  }

  const rows = await getManagedPublicNavItems(navId);
  c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  return ok(c, rows);
});

// GET /api/content – list all published pages (slugs + titles, for SSG)
publicRoutes.get("/content", publicReadLimit, async (c) => {
  const rows = await getManagedPublicContentPages();
  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return ok(c, rows);
});

// GET /api/content/:slug (published pages only)
publicRoutes.get("/content/:slug", publicReadLimit, async (c) => {
  const page = await getManagedPublicContentPageBySlug(c.req.param("slug"));
  if (!page) {
    return fail(c, 404, "Not found");
  }

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

    const ip = resolveClientIp(c.req.raw.headers);
    const result = await createManagedDeadLinkReport(id, ip);
    if (!result.ok) {
      return fail(c, 404, "Shop not found");
    }

    return ok(c, { message: "Danke für deinen Hinweis!" });
  },
);

// POST /api/shops/:id/concern – shop concern report (rate limited per IP)
publicRoutes.post(
  "/shops/:id/concern",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
  zValidator("json", concernBodySchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return fail(c, 400, "Invalid shop id");
    }

    const { reason } = c.req.valid("json");
    const ip = resolveClientIp(c.req.raw.headers);

    const result = await createManagedShopConcernReport(id, reason, ip);
    if (!result.ok && result.reason === "invalid_reason") {
      return fail(c, 400, "Bitte eine aussagekräftige Begründung angeben (mind. 10 Zeichen).");
    }
    if (!result.ok && result.reason === "not_found") {
      return fail(c, 404, "Shop not found");
    }

    return ok(c, { message: "Danke für dein Feedback!" });
  },
);

// GET /api/form-config/:name — active form configuration for the frontend
publicRoutes.get("/form-config/:name", publicReadLimit, async (c) => {
  const result = await getManagedPublicFormConfig(c.req.param("name"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return ok(c, result.data);
});

// GET /api/form-config-by-slug/:slug — active form config by frontend URL slug
publicRoutes.get("/form-config-by-slug/:slug", publicReadLimit, async (c) => {
  const result = await getManagedPublicFormConfigBySlug(c.req.param("slug"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return ok(c, result.data);
});

// GET /api/rejected/:token – public rejection reason page
publicRoutes.get("/rejected/:token", publicReadLimit, async (c) => {
  const token = c.req.param("token");
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return fail(c, 400, "Invalid token");
  }

  const page = await getManagedPublicRejectionPageByToken(token);
  if (!page) {
    return fail(c, 404, "Not found");
  }

  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return ok(c, page);
});

// Debug endpoint: cache stats (dev only)
if (env.NODE_ENV === "development") {
  publicRoutes.get("/cache/stats", (c) => {
    const result = getManagedPublicCacheStats();
    if (!result.ok) {
      return fail(c, 404, "Not available");
    }

    return ok(c, result.data);
  });
}
