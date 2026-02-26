import { getAdminStatsRow } from "../repositories/admin-stats.js";

export async function getManagedAdminStats() {
  return getAdminStatsRow();
}
