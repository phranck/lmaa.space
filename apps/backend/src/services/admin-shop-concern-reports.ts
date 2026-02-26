import {
  dismissAdminShopConcernReport,
  listAdminShopConcernReports,
} from "../repositories/admin-shop-concern-reports.js";

export async function getManagedAdminShopConcernReports() {
  return listAdminShopConcernReports();
}

export async function dismissManagedAdminShopConcernReport(id: number) {
  await dismissAdminShopConcernReport(id);
  return { message: "Report dismissed" };
}
