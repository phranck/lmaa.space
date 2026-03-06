import { Hono } from "hono";

import { ok } from "../../lib/http.js";
import type { AuthVariables } from "../../middleware/auth.js";
import { getAdminStatsRow } from "../../repositories/admin-stats.js";

/**
 * Admin statistics routes.
 */
export const statsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/stats
statsRoutes.get("/stats", async (c) => {
  const stats = await getAdminStatsRow();
  return ok(c, stats);
});
