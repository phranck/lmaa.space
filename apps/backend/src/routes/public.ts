import { Hono } from "hono";
import { fail, ok } from "../lib/http.js";
import { rateLimit } from "../middleware/rate-limit.js";
import {
  getManagedPublicFormConfig,
  getManagedPublicFormConfigBySlug,
} from "../services/admin-form-config.js";
import { executeSubmissionChain } from "../services/form-submission.js";
import {
  checkManagedPublicShopUrl,
  createManagedDeadLinkReport,
  createManagedShopConcernReport,
  getManagedPublicCacheStats,
  getManagedPublicCategories,
  getManagedPublicCategoryBySlug,
  getManagedPublicNav,
  getManagedPublicRejectionPage,
  getManagedPublicShops,
  getManagedPublicStats,
  getManagedPublishedContentList,
  getManagedPublishedContentPage,
  searchManagedPublicCatalog,
} from "../services/public.js";

/**
 * Public API routes consumed by the website and external clients.
 */
export const publicRoutes = new Hono();

// GET /api/categories
publicRoutes.get("/categories", async (c) => {
  const rows = await getManagedPublicCategories();
  c.header("Cache-Control", "private, max-age=30");
  return ok(c, rows);
});

// GET /api/stats – unique active shop count
publicRoutes.get("/stats", async (c) => {
  const stats = await getManagedPublicStats();
  c.header("Cache-Control", "public, max-age=60");
  return ok(c, stats);
});

// GET /api/categories/:slug
publicRoutes.get("/categories/:slug", async (c) => {
  const result = await getManagedPublicCategoryBySlug(c.req.param("slug"));
  if (!result.ok) {
    return fail(c, 404, "Category not found");
  }

  c.header("Cache-Control", "private, max-age=30");
  return ok(c, result.data);
});

// GET /api/shops
publicRoutes.get("/shops", async (c) => {
  const result = await getManagedPublicShops();
  c.header("X-Cache", result.cache);
  c.header("Cache-Control", "public, max-age=60");
  return ok(c, result.data);
});

// GET /api/search?q=...
publicRoutes.get("/search", async (c) => {
  const result = await searchManagedPublicCatalog(c.req.query("q"));
  return ok(c, result);
});

// GET /api/check-url?url= – check if a shop with the same domain already exists
publicRoutes.get("/check-url", async (c) => {
  const result = await checkManagedPublicShopUrl(c.req.query("url"));
  return ok(c, result);
});

// POST /api/form/:slug/submit — generic form submission
publicRoutes.post(
  "/form/:slug/submit",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const slug = c.req.param("slug");
    const data = await c.req.json<Record<string, unknown>>();

    const result = await getManagedPublicFormConfigBySlug(slug);
    if (!result.ok || !result.data.isActive) return fail(c, 404, "Not found");
    if (!result.data.submissionConfig) return fail(c, 400, "No submission config");

    await executeSubmissionChain(result.data.submissionConfig, data, result.data);
    return ok(c, { message: "OK" }, 201);
  },
);

// GET /api/nav/:navId
publicRoutes.get("/nav/:navId", async (c) => {
  const navId = c.req.param("navId");
  if (navId !== "header" && navId !== "footer") {
    return fail(c, 400, "Invalid navId");
  }

  const rows = await getManagedPublicNav(navId);
  c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  return ok(c, rows);
});

// GET /api/content – list all published pages (slugs + titles, for SSG)
publicRoutes.get("/content", async (c) => {
  const rows = await getManagedPublishedContentList();
  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return ok(c, rows);
});

// GET /api/content/:slug (published pages only)
publicRoutes.get("/content/:slug", async (c) => {
  const page = await getManagedPublishedContentPage(c.req.param("slug"));
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

    const ip = c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown";
    const result = await createManagedDeadLinkReport(id, ip);
    if (!result.ok) {
      return fail(c, 404, "Shop not found");
    }

    return ok(c, { message: result.message });
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
    const reason = typeof body?.reason === "string" ? body.reason : "";
    const ip = c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown";

    const result = await createManagedShopConcernReport(id, reason, ip);
    if (!result.ok && result.reason === "invalid_reason") {
      return fail(c, 400, "Bitte eine aussagekräftige Begründung angeben (mind. 10 Zeichen).");
    }
    if (!result.ok && result.reason === "not_found") {
      return fail(c, 404, "Shop not found");
    }

    return ok(c, { message: result.message });
  },
);

// GET /api/form-config/:name — active form configuration for the frontend
publicRoutes.get("/form-config/:name", async (c) => {
  const result = await getManagedPublicFormConfig(c.req.param("name"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return ok(c, result.data);
});

// GET /api/form-config-by-slug/:slug — active form config by frontend URL slug
publicRoutes.get("/form-config-by-slug/:slug", async (c) => {
  const result = await getManagedPublicFormConfigBySlug(c.req.param("slug"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return ok(c, result.data);
});

// GET /api/rejected/:id – public rejection reason page
publicRoutes.get("/rejected/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return fail(c, 400, "Invalid id");
  }

  const page = await getManagedPublicRejectionPage(id);
  if (!page) {
    return fail(c, 404, "Not found");
  }

  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return ok(c, page);
});

// Debug endpoint: cache stats (dev only)
publicRoutes.get("/cache/stats", (c) => {
  const result = getManagedPublicCacheStats();
  if (!result.ok) {
    return fail(c, 404, "Not available");
  }

  return ok(c, result.data);
});
