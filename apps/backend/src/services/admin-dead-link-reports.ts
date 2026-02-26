import {
  clearAdminDeadLinkReports,
  listAdminDeadLinkReports,
} from "../repositories/admin-dead-link-reports.js";

export async function getManagedAdminDeadLinkReports() {
  return listAdminDeadLinkReports();
}

export async function clearManagedAdminDeadLinkReports(shopId: number) {
  await clearAdminDeadLinkReports(shopId);
  return { message: "Reports cleared" };
}
