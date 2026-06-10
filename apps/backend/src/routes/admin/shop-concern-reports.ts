import { Hono } from "hono";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  dismissAdminShopConcernReport,
  listAdminShopConcernReports,
} from "../../repositories/admin-shop-concern-reports.js";

/**
 * Admin routes for user-submitted concern reports.
 */
export const shopConcernReportsRoutes = new Hono<{ Variables: AuthVariables }>();

// Report moderation is owner/admin-only; moderators are excluded.
shopConcernReportsRoutes.use("*", requireAdmin);

// GET /api/admin/shop-concern-reports
shopConcernReportsRoutes.get("/shop-concern-reports", async (c) => {
  const rows = await listAdminShopConcernReports();
  return ok(c, rows);
});

// DELETE /api/admin/shop-concern-reports/:id - dismiss a single report
shopConcernReportsRoutes.delete("/shop-concern-reports/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  await dismissAdminShopConcernReport(id);
  return ok(c, { message: "Report dismissed" });
});
