import { Hono } from "hono";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import type { AuthVariables } from "../../middleware/auth.js";
import {
  clearAdminDeadLinkReports,
  listAdminDeadLinkReports,
} from "../../repositories/admin-dead-link-reports.js";

/**
 * Admin routes for dead-link report moderation.
 */
export const deadLinkReportsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/dead-link-reports
deadLinkReportsRoutes.get("/dead-link-reports", async (c) => {
  const rows = await listAdminDeadLinkReports();
  return ok(c, rows);
});

// DELETE /api/admin/dead-link-reports/:shopId - clear all reports for a shop
deadLinkReportsRoutes.delete("/dead-link-reports/:shopId", async (c) => {
  const shopId = parseId(c.req.param("shopId"));
  if (!shopId) return fail(c, 400, "Invalid shop id");
  await clearAdminDeadLinkReports(shopId);
  return ok(c, { message: "Reports cleared" });
});
