import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/index.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";

export const statsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/stats
statsRoutes.get("/stats", requireAuth, async (c) => {
  const [stats] = await db.execute<{
    shops: number;
    categories: number;
    pendingSubmissions: number;
    totalSubmissions: number;
    deadLinkReports: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM shops) AS shops,
      (SELECT count(*)::int FROM categories) AS categories,
      (SELECT count(*)::int FROM submissions WHERE status = 'pending') AS "pendingSubmissions",
      (SELECT count(*)::int FROM submissions) AS "totalSubmissions",
      (SELECT count(DISTINCT shop_id)::int FROM dead_link_reports) AS "deadLinkReports"
  `);
  return c.json({ data: stats });
});
