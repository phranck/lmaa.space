import { Hono } from "hono";

import { fail, ok } from "../lib/http.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { resolveManagedRedirectUrl } from "../services/redirect-urls.js";

/**
 * Website-internal redirect resolver routes.
 *
 * These routes are consumed by the frontend server for `/r/:name` and are not
 * part of the external `/api/v1` OpenAPI surface.
 */
export const redirectUrlRoutes = new Hono();

const redirectReadLimit = rateLimit({ max: 100, windowMs: 60 * 1000 });

// GET /internal/redirect-urls/:name – resolve a managed public redirect URL
redirectUrlRoutes.get("/redirect-urls/:name", redirectReadLimit, async (c) => {
  const redirect = await resolveManagedRedirectUrl(c.req.param("name"));
  if (!redirect) return fail(c, 404, "Redirect URL not found");

  c.header("Cache-Control", "no-store");
  return ok(c, redirect);
});
