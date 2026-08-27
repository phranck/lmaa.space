import { sql } from "drizzle-orm";

import type { AdminStats } from "@lmaa/shared";

import { db } from "../db/client.js";

/**
 * Returns aggregated high-level dashboard counters.
 *
 * @returns Stats object with shop, category and submission counters.
 */
export async function getAdminStatsRow(): Promise<AdminStats> {
  const [stats] = await db.execute<AdminStats & Record<string, unknown>>(sql`
    SELECT
      (SELECT count(*)::int FROM shops) AS shops,
      (SELECT count(*)::int FROM categories) AS categories,
      (SELECT count(*)::int FROM submissions WHERE status = 'pending') AS "pendingSubmissions",
      (SELECT count(*)::int FROM submissions) AS "totalSubmissions",
      (SELECT count(DISTINCT shop_id)::int FROM dead_link_reports) AS "deadLinkReports"
  `);

  return stats;
}
