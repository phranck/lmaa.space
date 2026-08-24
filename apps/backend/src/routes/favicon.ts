import { Hono } from "hono";
import { z } from "zod";

import { ok } from "../lib/http.js";
import { validate } from "../middleware/validate-request.js";
import { resolveFavicon } from "../services/favicon.js";

/**
 * What a caller may ask about.
 *
 * The address is bounded and has to be an `https` one, so the parameter cannot
 * be pointed at a scheme the fetch guard was not written for. Where the site is
 * unreachable or has no icon, the answer says so rather than failing, because a
 * missing icon is an ordinary outcome.
 */
export const faviconQuerySchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .regex(/^https:\/\//, "Expected an https address"),
});

/**
 * Website-internal route for a site's own small mark.
 *
 * Mounted under `/internal`, where the token check refuses anybody who is not
 * this project's own renderer. That matters more here than elsewhere, because
 * the handler fetches an address the caller named: as an open route it would be
 * a way of making this server fetch things on somebody else's behalf.
 *
 * The icon comes back as data rather than as an address, so the page carries it
 * and a visitor's browser never asks a sponsor's website for anything.
 */
export const faviconRoutes = new Hono();

// GET /internal/favicon?url= – the site's own mark, inline
faviconRoutes.get("/favicon", validate("query", faviconQuerySchema), async (c) => {
  const { url } = c.req.valid("query");
  return ok(c, { dataUrl: await resolveFavicon(url) });
});

/**
 * The same answer for the dashboard, behind the admin session.
 *
 * A second mount rather than a second implementation, because what the editor
 * shows beside an address has to be the icon the site will actually carry. Two
 * lookups written separately would drift, and the drift would show as an editor
 * promising a mark the page then does not have.
 */
export const adminFaviconRoutes = new Hono();

// GET /api/v1/admin/favicon?url= – the same mark, for the editor
adminFaviconRoutes.get("/favicon", validate("query", faviconQuerySchema), async (c) => {
  const { url } = c.req.valid("query");
  return ok(c, { dataUrl: await resolveFavicon(url) });
});
