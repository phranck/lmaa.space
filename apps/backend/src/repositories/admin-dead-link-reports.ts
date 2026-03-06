import { count, desc, eq, max, ne } from "drizzle-orm";

import { db } from "../db/index.js";
import { deadLinkReports, shops } from "../db/schema.js";

/**
 * Aggregates dead-link reports per shop for dashboard triage.
 *
 * @returns Rows sorted by highest report count first.
 */
export async function listAdminDeadLinkReports() {
  return db
    .select({
      shopId: deadLinkReports.shopId,
      shopName: shops.name,
      shopUrl: shops.url,
      reportCount: count(deadLinkReports.id),
      lastReportedAt: max(deadLinkReports.reportedAt),
    })
    .from(deadLinkReports)
    .innerJoin(shops, eq(deadLinkReports.shopId, shops.id))
    .where(ne(shops.visibility, "deleted"))
    .groupBy(deadLinkReports.shopId, shops.name, shops.url)
    .orderBy(desc(count(deadLinkReports.id)));
}

/**
 * Deletes all dead-link reports for one shop.
 *
 * @param shopId - Shop id whose report history should be cleared.
 * @returns Resolves when delete operation has finished.
 */
export async function clearAdminDeadLinkReports(shopId: number): Promise<void> {
  await db.delete(deadLinkReports).where(eq(deadLinkReports.shopId, shopId));
}
