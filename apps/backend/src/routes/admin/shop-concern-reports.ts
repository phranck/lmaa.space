import { Hono } from "hono";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import {
  dismissManagedAdminShopConcernReport,
  getManagedAdminShopConcernReports,
} from "../../services/admin-shop-concern-reports.js";

export const shopConcernReportsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/shop-concern-reports
shopConcernReportsRoutes.get("/shop-concern-reports", requireAuth, async (c) => {
  const rows = await getManagedAdminShopConcernReports();
  return ok(c, rows);
});

// DELETE /api/admin/shop-concern-reports/:id – dismiss a single report
shopConcernReportsRoutes.delete("/shop-concern-reports/:id", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const result = await dismissManagedAdminShopConcernReport(id);
  return ok(c, result);
});
