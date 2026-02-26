import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { shopConcernReports, shops } from "../db/schema.js";

export async function listAdminShopConcernReports() {
  return db
    .select({
      id: shopConcernReports.id,
      shopId: shopConcernReports.shopId,
      shopName: shops.name,
      shopUrl: shops.url,
      reason: shopConcernReports.reason,
      reportedAt: shopConcernReports.reportedAt,
    })
    .from(shopConcernReports)
    .innerJoin(shops, eq(shopConcernReports.shopId, shops.id))
    .orderBy(desc(shopConcernReports.reportedAt));
}

export async function dismissAdminShopConcernReport(id: number): Promise<void> {
  await db.delete(shopConcernReports).where(eq(shopConcernReports.id, id));
}
