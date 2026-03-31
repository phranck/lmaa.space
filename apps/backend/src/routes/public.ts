import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { BillingPublicSummary } from "@lmaa/shared";
import { decodeShopToken } from "@lmaa/shared";

import { env } from "../config/env.js";
import { fail, ok } from "../lib/http.js";
import { shopFilterSchema } from "../lib/shop-filters.js";
import { rateLimit, resolveClientIp } from "../middleware/rate-limit.js";
import { getFooterConfig } from "../repositories/footer-config.js";
import { getEnabledMarkdownWidgetByKey } from "../repositories/markdown-widgets.js";
import {
  getManagedPublicFormConfig,
  getManagedPublicFormConfigBySlug,
} from "../services/admin-form-config.js";
import { getMediaAliasMap } from "../services/admin-media.js";
import { getFooterPreviewSession } from "../services/footer-preview-store.js";
import { executeSubmissionChain } from "../services/form-submission.js";
import { buildFormValidationSchema } from "../services/form-validation.js";
import { getCurrentHeroImage } from "../services/hero.js";
import { ZeropsApiRequestError, ZeropsClient } from "../services/network-clients/zerops-client.js";
import {
  validateShopUrl,
  createManagedDeadLinkReport,
  createManagedShopConcernReport,
  getManagedPublicCacheStats,
  getManagedPublicCategories,
  getManagedPublicCategoryBySlug,
  getManagedPublicContentPageBySlug,
  getManagedPublicContentPages,
  getManagedPublicNavItems,
  getManagedPublicRejectionPageByToken,
  getManagedPublicShopById,
  getManagedPublicShops,
  getManagedPublicStats,
  searchManagedPublicCatalog,
  getFilteredPublicCategories,
  getFilteredPublicCategoryBySlug,
  getFilteredPublicShops,
  getPublicFilterOptions,
  searchFilteredPublicCatalog,
  toggleShopLike,
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

// GET /api/shops/:token
publicRoutes.get("/shops/:token", publicReadLimit, async (c) => {
  const id = decodeShopToken(c.req.param("token"));
  if (id === null) {
    return fail(c, 400, "Invalid shop token");
  }

  const result = await getManagedPublicShopById(id);
  if (!result.ok) {
    return fail(c, 404, "Shop not found");
  }

  c.header("Cache-Control", "public, max-age=60");
  return ok(c, result.data);
});

// GET /api/search?q=...
publicRoutes.get("/search", publicReadLimit, async (c) => {
  const q = c.req.query("q")?.slice(0, 200);
  const result = await searchManagedPublicCatalog(q);
  return ok(c, result);
});

// GET /api/check-url?url= – check if a shop with the same domain already exists
publicRoutes.get("/check-url", publicReadLimit, async (c) => {
  const result = await validateShopUrl(c.req.query("url"));
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

    const rawShopUrl = typeof parsed.data.shopUrl === "string" ? parsed.data.shopUrl.trim() : undefined;
    if (rawShopUrl && !/^https?:\/\//i.test(rawShopUrl)) {
      parsed.data.shopUrl = `https://${rawShopUrl}`;
    }
    const shopUrl = typeof parsed.data.shopUrl === "string" ? parsed.data.shopUrl : undefined;
    if (shopUrl) {
      const urlCheck = await validateShopUrl(shopUrl);
      if (urlCheck.status === "published") {
        c.status(409);
        return c.json({
          error: {
            message: "Der Shop ist bereits eingetragen.",
            shopName: urlCheck.shopName,
          },
        });
      }
      if (urlCheck.status === "rejected") {
        c.status(409);
        return c.json({
          error: {
            message: "Dieser Shop wurde bereits geprüft und abgelehnt.",
            shopName: urlCheck.shopName,
            rejectionUrl: urlCheck.rejectionUrl,
          },
        });
      }
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

// POST /api/shops/:id/like — toggle like counter (rate limited, challenge-token protected)
const likeBodySchema = z.object({
  liked: z.boolean(),
  token: z.string().min(1),
  fingerprint: z.string().min(1),
});

publicRoutes.post(
  "/shops/:id/like",
  rateLimit({ max: 10, windowMs: 60 * 1000 }),
  zValidator("json", likeBodySchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return fail(c, 400, "Ungültige Shop-ID.");
    }

    const { liked, token } = c.req.valid("json");

    const result = await toggleShopLike(id, liked, token);
    if (!result.ok) {
      if (result.reason === "expired_token") {
        return fail(c, 403, "Der Token ist abgelaufen. Bitte lade die Seite neu.");
      }
      if (result.reason === "invalid_token") {
        return fail(c, 400, "Ungültiger Token.");
      }
      if (result.reason === "not_found") {
        return fail(c, 404, "Shop nicht gefunden.");
      }
      return fail(c, 400, "Ungültige Anfrage.");
    }

    return ok(c, { message: "OK" });
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

// GET /api/footer-config
publicRoutes.get("/footer-config", publicReadLimit, async (c) => {
  const config = await getFooterConfig();
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return ok(c, config);
});

// GET /api/markdown-widgets/:key
publicRoutes.get("/markdown-widgets/:key", publicReadLimit, async (c) => {
  const widget = await getEnabledMarkdownWidgetByKey(c.req.param("key"));
  if (!widget) {
    return fail(c, 404, "Not found");
  }

  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return ok(c, widget);
});

// GET /api/footer-preview/:token
publicRoutes.get("/footer-preview/:token", publicReadLimit, async (c) => {
  const token = c.req.param("token");
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return fail(c, 400, "Invalid token");
  }

  const config = getFooterPreviewSession(token);
  if (!config) {
    return fail(c, 404, "Preview not found");
  }

  c.header("Cache-Control", "no-store");
  return ok(c, config);
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

// GET /api/billing/summary – public cost summary for the website
let billingCache: { data: BillingPublicSummary; expiresAt: number } | null = null;
const BILLING_CACHE_TTL_MS = 30 * 60 * 1000;

publicRoutes.get("/billing/summary", publicReadLimit, async (c) => {
  if (billingCache && Date.now() < billingCache.expiresAt) {
    c.header("Cache-Control", "public, max-age=300");
    return ok(c, billingCache.data);
  }

  if (!env.BILLING_API_TOKEN) {
    return fail(c, 503, "BILLING_API_TOKEN is not configured.", "zerops_not_configured");
  }

  try {
    const client = new ZeropsClient(env.BILLING_API_TOKEN, env.BILLING_CLIENT_ID, env.BILLING_PROJECT_ID);
    const costs = await client.fetchCostSummary();
    const summary: BillingPublicSummary = {
      today: costs.today,
      thisMonth: costs.thisMonth,
    };
    billingCache = { data: summary, expiresAt: Date.now() + BILLING_CACHE_TTL_MS };
    c.header("Cache-Control", "public, max-age=300");
    return ok(c, summary);
  } catch (err) {
    if (err instanceof ZeropsApiRequestError) {
      return fail(c, 502, `Zerops API: ${err.message}`, err.errorCode);
    }
    return fail(c, 500, "Unexpected error while fetching billing data", "zerops_internal");
  }
});

// ---------------------------------------------------------------------------
// Filtered endpoints
// ---------------------------------------------------------------------------

// GET /api/filtered/categories?city=&radius=&country=&region=
publicRoutes.get("/filtered/categories", publicReadLimit, async (c) => {
  const filters = shopFilterSchema.parse({
    city: c.req.query("city"),
    radius: c.req.query("radius"),
    country: c.req.query("country"),
    region: c.req.query("region"),
  });
  const rows = await getFilteredPublicCategories(filters);
  return ok(c, rows);
});

// GET /api/filtered/categories/:slug?city=&radius=&country=&region=
publicRoutes.get("/filtered/categories/:slug", publicReadLimit, async (c) => {
  const slug = c.req.param("slug");
  const filters = shopFilterSchema.parse({
    city: c.req.query("city"),
    radius: c.req.query("radius"),
    country: c.req.query("country"),
    region: c.req.query("region"),
  });
  const result = await getFilteredPublicCategoryBySlug(slug, filters);
  if (!result.ok) {
    return fail(c, 404, "Category not found");
  }
  c.header("Cache-Control", "private, max-age=30");
  return ok(c, result.data);
});

// GET /api/filtered/shops?city=&radius=&country=&region=
publicRoutes.get("/filtered/shops", publicReadLimit, async (c) => {
  const filters = shopFilterSchema.parse({
    city: c.req.query("city"),
    radius: c.req.query("radius"),
    country: c.req.query("country"),
    region: c.req.query("region"),
  });
  const data = await getFilteredPublicShops(filters);
  return ok(c, data);
});

// GET /api/filtered/search?q=&city=&radius=&country=&region=
publicRoutes.get("/filtered/search", publicReadLimit, async (c) => {
  const q = c.req.query("q")?.slice(0, 200);
  const filters = shopFilterSchema.parse({
    city: c.req.query("city"),
    radius: c.req.query("radius"),
    country: c.req.query("country"),
    region: c.req.query("region"),
  });
  const result = await searchFilteredPublicCatalog(q, filters);
  return ok(c, result);
});

// GET /api/filter-options
publicRoutes.get("/filter-options", publicReadLimit, async (c) => {
  const options = await getPublicFilterOptions();
  c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  return ok(c, options);
});

// GET /api/media-aliases – alias → public URL map for markdown shortcodes
publicRoutes.get("/media-aliases", publicReadLimit, async (c) => {
  const map = await getMediaAliasMap();
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return ok(c, map);
});

// GET /api/hero?state=<visitor-state> -- refresh-count-based hero image rotation
publicRoutes.get("/hero", publicReadLimit, async (c) => {
  const rawState = c.req.query("state") ?? null;
  const image = await getCurrentHeroImage(rawState);
  c.header("Cache-Control", "no-store");
  return ok(c, image);
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
