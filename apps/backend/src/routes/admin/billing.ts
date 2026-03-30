import { Hono } from "hono";

import { env } from "../../config/env.js";
import { fail, ok } from "../../lib/http.js";
import { logger } from "../../lib/logger.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { ZeropsApiRequestError, ZeropsClient } from "../../services/network-clients/zerops-client.js";

export const billingRoutes = new Hono<{ Variables: AuthVariables }>();

billingRoutes.use("*", requireAdmin);

/** In-memory cache with TTL. */
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getClient(): ZeropsClient | null {
  if (!env.ZEROPS_API_TOKEN) return null;
  return new ZeropsClient(env.ZEROPS_API_TOKEN, env.ZEROPS_CLIENT_ID, env.ZEROPS_PROJECT_ID);
}

function handleZeropsError(c: import("hono").Context, err: unknown) {
  if (err instanceof ZeropsApiRequestError) {
    if (err.httpStatus === 401 || err.httpStatus === 403) {
      return fail(c, 401, `Zerops API: ${err.message}`, err.errorCode);
    }
    return fail(c, 502, `Zerops API: ${err.message}`, err.errorCode);
  }
  if (err instanceof Error && err.name === "TimeoutError") {
    return fail(c, 504, "Zerops API: Request timed out", "zerops_timeout");
  }
  logger.error({ err }, "Zerops billing: unexpected error");
  return fail(c, 500, "Unexpected error while contacting Zerops API", "zerops_internal");
}

// GET /api/admin/billing/costs
billingRoutes.get("/billing/costs", async (c) => {
  const cached = getCached("billing:costs");
  if (cached) return ok(c, cached);

  const client = getClient();
  if (!client) return fail(c, 503, "ZEROPS_API_TOKEN is not configured on the server.", "zerops_not_configured");
  if (!env.ZEROPS_CLIENT_ID) return fail(c, 503, "ZEROPS_CLIENT_ID is not configured on the server.", "zerops_client_id_missing");

  try {
    const data = await client.fetchCostSummary();
    setCache("billing:costs", data);
    return ok(c, data);
  } catch (err) {
    return handleZeropsError(c, err);
  }
});

// GET /api/admin/billing/timeline?days=30
billingRoutes.get("/billing/timeline", async (c) => {
  const days = Math.min(Number(c.req.query("days")) || 30, 90);
  const cacheKey = `billing:timeline:${days}`;

  const cached = getCached(cacheKey);
  if (cached) return ok(c, cached);

  const client = getClient();
  if (!client) return fail(c, 503, "ZEROPS_API_TOKEN is not configured on the server.", "zerops_not_configured");
  if (!env.ZEROPS_CLIENT_ID) return fail(c, 503, "ZEROPS_CLIENT_ID is not configured on the server.", "zerops_client_id_missing");

  try {
    const data = await client.fetchCostTimeline(days);
    setCache(cacheKey, data);
    return ok(c, data);
  } catch (err) {
    return handleZeropsError(c, err);
  }
});

// GET /api/admin/billing/status
billingRoutes.get("/billing/status", async (c) => {
  const cached = getCached("billing:status");
  if (cached) return ok(c, cached);

  const client = getClient();
  if (!client) return fail(c, 503, "ZEROPS_API_TOKEN is not configured on the server.", "zerops_not_configured");

  try {
    const data = await client.fetchBillingStatus();
    if (!data) return fail(c, 422, "ZEROPS_CLIENT_ID is not configured. Credit display requires it.", "zerops_client_id_missing");
    setCache("billing:status", data);
    return ok(c, data);
  } catch (err) {
    return handleZeropsError(c, err);
  }
});
