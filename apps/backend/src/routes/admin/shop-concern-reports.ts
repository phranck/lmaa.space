import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/index.js";
import { shopConcernReports, shops } from "../../db/schema.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";

export const shopConcernReportsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/shop-concern-reports
shopConcernReportsRoutes.get("/shop-concern-reports", requireAuth, async (c) => {
  const rows = await db
    .select({
      id: shopConcernReports.id,
      shopId: shopConcernReports.shopId,
      shopName: shops.name,
      shopUrl: shops.url,
      reason: shopConcernReports.reason,
      reportedAt: shopConcernReports.reportedAt,
    })
    .from(shopConcernReports)
    .innerJoin(shops, eq(shopConcernReports.shopId, shops.id))
    .orderBy(desc(shopConcernReports.reportedAt));
  return c.json({ data: rows });
});

// DELETE /api/admin/shop-concern-reports/:id – dismiss a single report
shopConcernReportsRoutes.delete("/shop-concern-reports/:id", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  await db.delete(shopConcernReports).where(eq(shopConcernReports.id, id));
  return c.json({ data: { message: "Report dismissed" } });
});
