import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

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

const periodQuery = z.object({ period: z.enum(["today", "7d", "30d", "60d", "90d"]).optional() });
const metricsQuery = z.object({
  period: z.enum(["today", "7d", "30d", "60d", "90d"]).optional(),
  type: z
    .enum(["url", "referrer", "browser", "os", "device", "country", "region", "city"])
    .optional(),
});

// GET /api/admin/umami/stats?period=today|7d|30d
umamiRoutes.get("/umami/stats", zValidator("query", periodQuery), async (c) => {
  const { period } = c.req.valid("query");
  const data = await getManagedUmamiStats(period);
  return ok(c, data);
});

// GET /api/admin/umami/pageviews?period=today|7d|30d
umamiRoutes.get("/umami/pageviews", zValidator("query", periodQuery), async (c) => {
  const { period } = c.req.valid("query");
  const data = await getManagedUmamiPageviews(period);
  return ok(c, data);
});

// GET /api/admin/umami/metrics?type=url|country|referrer&period=today|7d|30d
umamiRoutes.get("/umami/metrics", zValidator("query", metricsQuery), async (c) => {
  const { type, period } = c.req.valid("query");
  const data = await getManagedUmamiMetrics(type, period);
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
umamiRoutes.get("/umami/events/search-terms", zValidator("query", periodQuery), async (c) => {
  const { period } = c.req.valid("query");
  const data = await getManagedUmamiSearchTerms(period);
  return ok(c, data);
});

// GET /api/admin/umami/events/category-clicks?period=today|7d|30d
umamiRoutes.get("/umami/events/category-clicks", zValidator("query", periodQuery), async (c) => {
  const { period } = c.req.valid("query");
  const data = await getManagedUmamiCategoryClicks(period);
  return ok(c, data);
});

// GET /api/admin/umami/events/shop-visits?period=today|7d|30d
umamiRoutes.get("/umami/events/shop-visits", zValidator("query", periodQuery), async (c) => {
  const { period } = c.req.valid("query");
  const data = await getManagedUmamiShopVisitClicks(period);
  return ok(c, data);
});

// GET /api/admin/umami/events/shop-visits/total?period=today|7d|30d
umamiRoutes.get("/umami/events/shop-visits/total", zValidator("query", periodQuery), async (c) => {
  const { period } = c.req.valid("query");
  const data = await getManagedUmamiShopVisitTotal(period);
  return ok(c, data);
});

// GET /api/admin/umami/events/site-links?period=today|7d|30d
umamiRoutes.get("/umami/events/site-links", zValidator("query", periodQuery), async (c) => {
  const { period } = c.req.valid("query");
  const data = await getManagedUmamiSiteLinkClicks(period);
  return ok(c, data);
});

// GET /api/admin/umami/events/interactions/total?period=today|7d|30d
umamiRoutes.get("/umami/events/interactions/total", zValidator("query", periodQuery), async (c) => {
  const { period } = c.req.valid("query");
  const data = await getManagedUmamiInteractionTotal(period);
  return ok(c, data);
});
