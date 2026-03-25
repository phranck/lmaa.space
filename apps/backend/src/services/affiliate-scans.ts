import { scanShopAffiliate } from "./affiliate-scanner.js";
import { logger } from "../lib/logger.js";
import {
  createAffiliateScanJob,
  getAllShopIdsAndNames,
  getAffiliateScanJob,
  updateAffiliateScanJob,
  upsertAffiliateScan,
} from "../repositories/admin-affiliate-scans.js";

/** Currently running batch job ID, null if idle. */
let activeBatchJobId: number | null = null;
/** Set to true to signal cancellation of the active batch. */
let cancelRequested = false;

/** Returns the database ID of the currently running batch scan job, or `null` if idle. */
export function getActiveBatchJobId(): number | null {
  return activeBatchJobId;
}

/**
 * Run a single affiliate scan for one shop and persist the result.
 */
export async function runSingleScan(
  shopId: number,
  shopName: string,
  shopUrl: string,
  scannedBy: number | null,
) {
  const result = await scanShopAffiliate(shopName, shopUrl);

  return upsertAffiliateScan({
    shopId,
    ...result,
    scannedBy,
  });
}

/**
 * Start a batch scan job. Only one batch can run at a time.
 * Returns the job immediately; scanning happens in the background.
 */
export async function startBatchScan(
  shopIds: number[] | undefined,
  startedBy: number | null,
) {
  if (activeBatchJobId !== null) {
    throw new Error("A batch scan is already running");
  }

  let targets: Array<{ id: number; name: string; url: string }>;
  if (shopIds && shopIds.length > 0) {
    const all = await getAllShopIdsAndNames();
    targets = all.filter((s) => shopIds.includes(s.id));
  } else {
    targets = await getAllShopIdsAndNames();
  }

  if (targets.length === 0) {
    throw new Error("No shops to scan");
  }

  const job = await createAffiliateScanJob({
    totalShops: targets.length,
    startedBy,
  });

  activeBatchJobId = job.id;
  cancelRequested = false;

  // Run in background (fire and forget)
  runBatchInBackground(job.id, targets, startedBy).catch((err) => {
    logger.error({ err, jobId: job.id }, "Batch scan crashed unexpectedly");
  });

  return job;
}

/**
 * Cancel the currently running batch job.
 */
export async function cancelBatchScan(jobId: number): Promise<boolean> {
  if (activeBatchJobId !== jobId) return false;
  cancelRequested = true;
  return true;
}

async function runBatchInBackground(
  jobId: number,
  targets: Array<{ id: number; name: string; url: string }>,
  scannedBy: number | null,
) {
  let completed = 0;
  let failed = 0;
  const errors: Array<{ shopId: number; shopName: string; error: string }> = [];

  await updateAffiliateScanJob(jobId, { status: "running" });

  for (const shop of targets) {
    if (cancelRequested) {
      await updateAffiliateScanJob(jobId, {
        status: "cancelled",
        completedShops: completed,
        failedShops: failed,
        errors,
        completedAt: new Date(),
      });
      activeBatchJobId = null;
      cancelRequested = false;
      return;
    }

    try {
      await runSingleScan(shop.id, shop.name, shop.url, scannedBy);
      completed++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ shopId: shop.id, shopName: shop.name, error: message });
      logger.warn({ shopId: shop.id, err: message }, "Affiliate scan failed for shop");
    }

    await updateAffiliateScanJob(jobId, {
      completedShops: completed,
      failedShops: failed,
      errors,
    });
  }

  await updateAffiliateScanJob(jobId, {
    status: failed === targets.length ? "failed" : "completed",
    completedShops: completed,
    failedShops: failed,
    errors,
    completedAt: new Date(),
  });

  activeBatchJobId = null;
}
