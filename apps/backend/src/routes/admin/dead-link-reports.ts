import { count, desc, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/index.js";
import { deadLinkReports, shops } from "../../db/schema.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";

export const deadLinkReportsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/dead-link-reports
deadLinkReportsRoutes.get("/dead-link-reports", requireAuth, async (c) => {
  const rows = await db
    .select({
      shopId: deadLinkReports.shopId,
      shopName: shops.name,
      shopUrl: shops.url,
      reportCount: count(deadLinkReports.id),
      lastReportedAt: max(deadLinkReports.reportedAt),
    })
    .from(deadLinkReports)
    .innerJoin(shops, eq(deadLinkReports.shopId, shops.id))
    .groupBy(deadLinkReports.shopId, shops.name, shops.url)
    .orderBy(desc(count(deadLinkReports.id)));
  return c.json({ data: rows });
});

// DELETE /api/admin/dead-link-reports/:shopId – clear all reports for a shop
deadLinkReportsRoutes.delete("/dead-link-reports/:shopId", requireAuth, async (c) => {
  const shopId = parseId(c.req.param("shopId"));
  if (!shopId) return c.json({ error: { message: "Invalid shop id" } }, 400);
  await db.delete(deadLinkReports).where(eq(deadLinkReports.shopId, shopId));
  return c.json({ data: { message: "Reports cleared" } });
});
