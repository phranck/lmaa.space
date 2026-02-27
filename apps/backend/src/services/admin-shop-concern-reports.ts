import {
  dismissAdminShopConcernReport,
  listAdminShopConcernReports,
} from "../repositories/admin-shop-concern-reports.js";

/**
 * Lists shop concern reports for moderation dashboard.
 *
 * @returns Shop concern report rows.
 */
export async function getManagedAdminShopConcernReports() {
  return listAdminShopConcernReports();
}

/**
 * Dismisses one shop concern report entry.
 *
 * @param id - Report id.
 * @returns Confirmation payload.
 */
export async function dismissManagedAdminShopConcernReport(id: number) {
  await dismissAdminShopConcernReport(id);
  return { message: "Report dismissed" };
}
