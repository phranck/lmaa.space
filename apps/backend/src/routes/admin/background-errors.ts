import { Hono } from "hono";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  deleteBackgroundError,
  listBackgroundErrors,
  resolveBackgroundError,
} from "../../repositories/background-errors.js";

export const backgroundErrorsRoutes = new Hono<{ Variables: AuthVariables }>();

// Background error logs may contain internal detail; owner/admin-only.
backgroundErrorsRoutes.use("*", requireAdmin);

/**
 * GET /background-errors
 *
 * Query params:
 *  - resolved: "true" | "false" (optional)
 *  - source: string (optional)
 *  - limit: number (default 100)
 *  - offset: number (default 0)
 */
backgroundErrorsRoutes.get("/background-errors", async (c) => {
  const { resolved: resolvedParam, source, limit: limitParam, offset: offsetParam } = c.req.query();

  const resolved = resolvedParam === "true" ? true : resolvedParam === "false" ? false : undefined;
  const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 100, 1), 500) : 100;
  const offset = offsetParam ? Math.max(Number(offsetParam) || 0, 0) : 0;

  const rows = await listBackgroundErrors({ resolved, source: source || undefined, limit, offset });
  return ok(c, rows);
});

/**
 * POST /background-errors/:id/resolve
 *
 * Marks the error as resolved by the authenticated admin.
 */
backgroundErrorsRoutes.post("/background-errors/:id/resolve", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");

  const adminId = c.get("adminId");
  const updated = await resolveBackgroundError(id, adminId);
  if (!updated) return fail(c, 404, "Background error not found");

  return ok(c, updated);
});

/**
 * DELETE /background-errors/:id
 *
 * Permanently deletes an error entry.
 */
backgroundErrorsRoutes.delete("/background-errors/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");

  const deleted = await deleteBackgroundError(id);
  if (!deleted) return fail(c, 404, "Background error not found");

  return ok(c, deleted);
});
