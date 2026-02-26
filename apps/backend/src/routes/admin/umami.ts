import { Hono } from "hono";
import { ok } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import {
  UMAMI_WEBSITE_ID,
  type UmamiPeriod,
  periodToRange,
  umamiConfigured,
  umamiGet,
} from "../../services/umami.js";

export const umamiRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/umami/stats?period=today|7d|30d
umamiRoutes.get("/umami/stats", requireAuth, async (c) => {
  if (!umamiConfigured) return ok(c, null);
  const period = (c.req.query("period") ?? "7d") as UmamiPeriod;
  const { startAt, endAt } = periodToRange(period);
  try {
    const data = await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`,
    );
    return ok(c, data);
  } catch {
    return ok(c, null);
  }
});

// GET /api/admin/umami/pageviews?period=today|7d|30d
umamiRoutes.get("/umami/pageviews", requireAuth, async (c) => {
  if (!umamiConfigured) return ok(c, null);
  const period = (c.req.query("period") ?? "7d") as UmamiPeriod;
  const { startAt, endAt } = periodToRange(period);
  const unit = period === "today" ? "hour" : "day";
  try {
    const data = await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=${unit}`,
    );
    return ok(c, data);
  } catch {
    return ok(c, null);
  }
});

// GET /api/admin/umami/metrics?type=url|country|referrer&period=today|7d|30d
umamiRoutes.get("/umami/metrics", requireAuth, async (c) => {
  if (!umamiConfigured) return ok(c, null);
  const period = (c.req.query("period") ?? "7d") as UmamiPeriod;
  const type = c.req.query("type") ?? "url";
  const { startAt, endAt } = periodToRange(period);
  try {
    const data = await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/metrics?type=${type}&startAt=${startAt}&endAt=${endAt}&limit=10`,
    );
    return ok(c, data);
  } catch {
    return ok(c, null);
  }
});

// GET /api/admin/umami/active – visitors in the last 5 minutes
umamiRoutes.get("/umami/active", requireAuth, async (c) => {
  if (!umamiConfigured) return ok(c, null);
  try {
    const data = await umamiGet(`/websites/${UMAMI_WEBSITE_ID}/active`);
    return ok(c, data);
  } catch {
    return ok(c, null);
  }
});

// GET /api/admin/umami/realtime – last 30 minutes
umamiRoutes.get("/umami/realtime", requireAuth, async (c) => {
  if (!umamiConfigured) return ok(c, null);
  try {
    const data = await umamiGet(`/realtime/${UMAMI_WEBSITE_ID}`);
    return ok(c, data);
  } catch {
    return ok(c, null);
  }
});
