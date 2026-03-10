import { Hono } from "hono";

import { ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  getManagedUmamiActive,
  getManagedUmamiCategoryClicks,
  getManagedUmamiInteractionTotal,
  getManagedUmamiMetrics,
  getManagedUmamiPageviews,
  getManagedUmamiRealtime,
  getManagedUmamiSearchTerms,
  getManagedUmamiShopVisitClicks,
  getManagedUmamiShopVisitTotal,
  getManagedUmamiSiteLinkClicks,
  getManagedUmamiStats,
} from "../../services/admin-umami.js";

/**
 * Admin analytics routes backed by Umami.
 */
export const umamiRoutes = new Hono<{ Variables: AuthVariables }>();

umamiRoutes.use("*", requireAdmin);

// GET /api/admin/umami/stats?period=today|7d|30d
umamiRoutes.get("/umami/stats", async (c) => {
  const data = await getManagedUmamiStats(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/pageviews?period=today|7d|30d
umamiRoutes.get("/umami/pageviews", async (c) => {
  const data = await getManagedUmamiPageviews(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/metrics?type=url|country|referrer&period=today|7d|30d
umamiRoutes.get("/umami/metrics", async (c) => {
  const data = await getManagedUmamiMetrics(c.req.query("type"), c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/active – visitors in the last 5 minutes
umamiRoutes.get("/umami/active", async (c) => {
  const data = await getManagedUmamiActive();
  return ok(c, data);
});

// GET /api/admin/umami/realtime – last 30 minutes
umamiRoutes.get("/umami/realtime", async (c) => {
  const data = await getManagedUmamiRealtime();
  return ok(c, data);
});

// GET /api/admin/umami/events/search-terms?period=today|7d|30d
umamiRoutes.get("/umami/events/search-terms", async (c) => {
  const data = await getManagedUmamiSearchTerms(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/events/category-clicks?period=today|7d|30d
umamiRoutes.get("/umami/events/category-clicks", async (c) => {
  const data = await getManagedUmamiCategoryClicks(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/events/shop-visits?period=today|7d|30d
umamiRoutes.get("/umami/events/shop-visits", async (c) => {
  const data = await getManagedUmamiShopVisitClicks(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/events/shop-visits/total?period=today|7d|30d
umamiRoutes.get("/umami/events/shop-visits/total", async (c) => {
  const data = await getManagedUmamiShopVisitTotal(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/events/site-links?period=today|7d|30d
umamiRoutes.get("/umami/events/site-links", async (c) => {
  const data = await getManagedUmamiSiteLinkClicks(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/events/interactions/total?period=today|7d|30d
umamiRoutes.get("/umami/events/interactions/total", async (c) => {
  const data = await getManagedUmamiInteractionTotal(c.req.query("period"));
  return ok(c, data);
});
