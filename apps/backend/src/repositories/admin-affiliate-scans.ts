import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { db } from "../db/index.js";
import { affiliateScanJobs, affiliateScans, shops } from "../db/schema.js";
import type { AffiliateScanInsert } from "../db/schema.js";

type ScanStatus = "direct" | "network" | "inquiry" | "none";
type TrackingStatus = "open" | "contacted" | "confirmed" | "rejected";

export async function listAffiliateScans(filters?: {
  status?: ScanStatus;
  tracking?: TrackingStatus;
  network?: string;
  search?: string;
}) {
  const conditions: SQL[] = [];

  if (filters?.status) {
    conditions.push(eq(affiliateScans.status, filters.status));
  }
  if (filters?.tracking) {
    conditions.push(eq(affiliateScans.trackingStatus, filters.tracking));
  }
  if (filters?.network) {
    conditions.push(ilike(affiliateScans.networkName, `%${filters.network}%`));
  }
  if (filters?.search) {
    const searchCond = or(
      ilike(shops.name, `%${filters.search}%`),
      ilike(shops.url, `%${filters.search}%`),
      ilike(affiliateScans.networkName, `%${filters.search}%`),
    );
    if (searchCond) conditions.push(searchCond);
  }

  return db
    .select({
      id: affiliateScans.id,
      shopId: affiliateScans.shopId,
      shopName: shops.name,
      shopUrl: shops.url,
      status: affiliateScans.status,
      programFound: affiliateScans.programFound,
      programType: affiliateScans.programType,
      programUrl: affiliateScans.programUrl,
      networkName: affiliateScans.networkName,
      compensationModel: affiliateScans.compensationModel,
      commission: affiliateScans.commission,
      cookieDuration: affiliateScans.cookieDuration,
      payoutThreshold: affiliateScans.payoutThreshold,
      applicationUrl: affiliateScans.applicationUrl,
      contactEmail: affiliateScans.contactEmail,
      requirements: affiliateScans.requirements,
      notes: affiliateScans.notes,
      recommendation: affiliateScans.recommendation,
      trackingStatus: affiliateScans.trackingStatus,
      trackingNote: affiliateScans.trackingNote,
      scannedAt: affiliateScans.scannedAt,
      scannedBy: affiliateScans.scannedBy,
      updatedAt: affiliateScans.updatedAt,
    })
    .from(affiliateScans)
    .innerJoin(shops, eq(affiliateScans.shopId, shops.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(affiliateScans.scannedAt));
}

export async function getAffiliateScanByShopId(shopId: number) {
  const [row] = await db
    .select()
    .from(affiliateScans)
    .where(eq(affiliateScans.shopId, shopId))
    .limit(1);
  return row ?? null;
}

export async function upsertAffiliateScan(data: AffiliateScanInsert) {
  const [row] = await db
    .insert(affiliateScans)
    .values(data)
    .onConflictDoUpdate({
      target: affiliateScans.shopId,
      set: {
        status: data.status,
        programFound: data.programFound,
        programType: data.programType,
        programUrl: data.programUrl,
        networkName: data.networkName,
        compensationModel: data.compensationModel,
        commission: data.commission,
        cookieDuration: data.cookieDuration,
        payoutThreshold: data.payoutThreshold,
        applicationUrl: data.applicationUrl,
        contactEmail: data.contactEmail,
        requirements: data.requirements,
        notes: data.notes,
        recommendation: data.recommendation,
        scannedAt: data.scannedAt ?? sql`now()`,
        scannedBy: data.scannedBy,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return row;
}

export async function updateAffiliateTracking(
  shopId: number,
  trackingStatus: TrackingStatus,
  trackingNote: string | null | undefined,
) {
  const [row] = await db
    .update(affiliateScans)
    .set({ trackingStatus, trackingNote, updatedAt: sql`now()` })
    .where(eq(affiliateScans.shopId, shopId))
    .returning();
  return row ?? null;
}

export async function deleteAllAffiliateScans(): Promise<void> {
  await db.delete(affiliateScans);
}

export async function deleteAffiliateScan(shopId: number): Promise<void> {
  await db.delete(affiliateScans).where(eq(affiliateScans.shopId, shopId));
}

export async function getAffiliateStats() {
  const rows = await db
    .select({
      status: affiliateScans.status,
      trackingStatus: affiliateScans.trackingStatus,
      programFound: affiliateScans.programFound,
      count: count(),
    })
    .from(affiliateScans)
    .groupBy(affiliateScans.status, affiliateScans.trackingStatus, affiliateScans.programFound);

  const stats = {
    total: 0,
    byStatus: { direct: 0, network: 0, inquiry: 0, none: 0 } as Record<string, number>,
    byTracking: { open: 0, contacted: 0, confirmed: 0, rejected: 0 } as Record<string, number>,
    withProgram: 0,
    withoutProgram: 0,
  };

  for (const row of rows) {
    stats.total += row.count;
    stats.byStatus[row.status] = (stats.byStatus[row.status] ?? 0) + row.count;
    stats.byTracking[row.trackingStatus] =
      (stats.byTracking[row.trackingStatus] ?? 0) + row.count;
    if (row.programFound) {
      stats.withProgram += row.count;
    } else {
      stats.withoutProgram += row.count;
    }
  }

  return stats;
}

export async function createAffiliateScanJob(data: {
  totalShops: number;
  startedBy: number | null;
}) {
  const [row] = await db
    .insert(affiliateScanJobs)
    .values({ ...data, status: "pending" })
    .returning();
  return row;
}

export async function getAffiliateScanJob(id: number) {
  const [row] = await db
    .select()
    .from(affiliateScanJobs)
    .where(eq(affiliateScanJobs.id, id))
    .limit(1);
  return row ?? null;
}

type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export async function updateAffiliateScanJob(
  id: number,
  data: Partial<{
    status: JobStatus;
    completedShops: number;
    failedShops: number;
    errors: Array<{ shopId: number; shopName: string; error: string }>;
    completedAt: Date;
  }>,
) {
  const [row] = await db
    .update(affiliateScanJobs)
    .set(data)
    .where(eq(affiliateScanJobs.id, id))
    .returning();
  return row ?? null;
}

export async function getAllShopIdsAndNames(): Promise<Array<{ id: number; name: string; url: string }>> {
  return db
    .select({ id: shops.id, name: shops.name, url: shops.url })
    .from(shops)
    .where(eq(shops.visibility, "public"))
    .orderBy(shops.name);
}

export async function exportAllAffiliateScans() {
  return db
    .select({
      shopName: shops.name,
      shopUrl: shops.url,
      status: affiliateScans.status,
      programFound: affiliateScans.programFound,
      programType: affiliateScans.programType,
      programUrl: affiliateScans.programUrl,
      networkName: affiliateScans.networkName,
      compensationModel: affiliateScans.compensationModel,
      commission: affiliateScans.commission,
      cookieDuration: affiliateScans.cookieDuration,
      payoutThreshold: affiliateScans.payoutThreshold,
      applicationUrl: affiliateScans.applicationUrl,
      contactEmail: affiliateScans.contactEmail,
      requirements: affiliateScans.requirements,
      notes: affiliateScans.notes,
      recommendation: affiliateScans.recommendation,
    })
    .from(affiliateScans)
    .innerJoin(shops, eq(affiliateScans.shopId, shops.id))
    .orderBy(shops.name);
}
