import { Hono } from "hono";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import {
  clearManagedAdminDeadLinkReports,
  getManagedAdminDeadLinkReports,
} from "../../services/admin-dead-link-reports.js";

export const deadLinkReportsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/dead-link-reports
deadLinkReportsRoutes.get("/dead-link-reports", requireAuth, async (c) => {
  const rows = await getManagedAdminDeadLinkReports();
  return ok(c, rows);
});

// DELETE /api/admin/dead-link-reports/:shopId – clear all reports for a shop
deadLinkReportsRoutes.delete("/dead-link-reports/:shopId", requireAuth, async (c) => {
  const shopId = parseId(c.req.param("shopId"));
  if (!shopId) return fail(c, 400, "Invalid shop id");
  const result = await clearManagedAdminDeadLinkReports(shopId);
  return ok(c, result);
});
