import { Hono } from "hono";
import { ok } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import {
  getManagedUmamiActive,
  getManagedUmamiMetrics,
  getManagedUmamiPageviews,
  getManagedUmamiRealtime,
  getManagedUmamiStats,
} from "../../services/admin-umami.js";

export const umamiRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/umami/stats?period=today|7d|30d
umamiRoutes.get("/umami/stats", requireAuth, async (c) => {
  const data = await getManagedUmamiStats(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/pageviews?period=today|7d|30d
umamiRoutes.get("/umami/pageviews", requireAuth, async (c) => {
  const data = await getManagedUmamiPageviews(c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/metrics?type=url|country|referrer&period=today|7d|30d
umamiRoutes.get("/umami/metrics", requireAuth, async (c) => {
  const data = await getManagedUmamiMetrics(c.req.query("type"), c.req.query("period"));
  return ok(c, data);
});

// GET /api/admin/umami/active – visitors in the last 5 minutes
umamiRoutes.get("/umami/active", requireAuth, async (c) => {
  const data = await getManagedUmamiActive();
  return ok(c, data);
});

// GET /api/admin/umami/realtime – last 30 minutes
umamiRoutes.get("/umami/realtime", requireAuth, async (c) => {
  const data = await getManagedUmamiRealtime();
  return ok(c, data);
});
