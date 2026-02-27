import {
  clearAdminDeadLinkReports,
  listAdminDeadLinkReports,
} from "../repositories/admin-dead-link-reports.js";

/**
 * Lists aggregated dead-link reports for moderation dashboard.
 *
 * @returns Report rows grouped by shop.
 */
export async function getManagedAdminDeadLinkReports() {
  return listAdminDeadLinkReports();
}

/**
 * Clears all dead-link reports for a given shop.
 *
 * @param shopId - Shop id whose report history should be cleared.
 * @returns Confirmation payload.
 */
export async function clearManagedAdminDeadLinkReports(shopId: number) {
  await clearAdminDeadLinkReports(shopId);
  return { message: "Reports cleared" };
}
