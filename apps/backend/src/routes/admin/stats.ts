import { Hono } from "hono";
import { ok } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import { getManagedAdminStats } from "../../services/admin-stats.js";

export const statsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/stats
statsRoutes.get("/stats", requireAuth, async (c) => {
  const stats = await getManagedAdminStats();
  return ok(c, stats);
});
