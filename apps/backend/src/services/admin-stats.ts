import { getAdminStatsRow } from "../repositories/admin-stats.js";

/**
 * Returns aggregate admin dashboard counters.
 *
 * @returns Aggregate counts for shops, categories, submissions and reports.
 */
export async function getManagedAdminStats() {
  return getAdminStatsRow();
}
