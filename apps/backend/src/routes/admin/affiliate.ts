import { Hono } from "hono";

import {
  affiliateBatchScanSchema,
  affiliateImportSchema,
  affiliateScansQuerySchema,
  affiliateTrackingUpdateSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import type { AuthVariables } from "../../middleware/auth.js";
import {
  deleteAffiliateScan,
  exportAllAffiliateScans,
  getAffiliateScanByShopId,
  getAffiliateScanJob,
  getAffiliateStats,
  listAffiliateScans,
  updateAffiliateTracking,
  upsertAffiliateScan,
  getAllShopIdsAndNames,
} from "../../repositories/admin-affiliate-scans.js";
import {
  cancelBatchScan,
  getActiveBatchJobId,
  runSingleScan,
  startBatchScan,
} from "../../services/affiliate-scans.js";
import { checkOllamaHealth } from "../../services/ollama-client.js";

export const affiliateRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/affiliate/scans
affiliateRoutes.get("/affiliate/scans", async (c) => {
  const query = affiliateScansQuerySchema.safeParse(c.req.query());
  if (!query.success) return fail(c, 400, "Invalid query parameters");
  const rows = await listAffiliateScans(query.data);
  return ok(c, rows);
});

// GET /api/admin/affiliate/stats
affiliateRoutes.get("/affiliate/stats", async (c) => {
  const stats = await getAffiliateStats();
  return ok(c, stats);
});

// PATCH /api/admin/affiliate/scans/:shopId/tracking
affiliateRoutes.patch("/affiliate/scans/:shopId/tracking", async (c) => {
  const shopId = parseId(c.req.param("shopId"));
  if (!shopId) return fail(c, 400, "Invalid shop id");

  const body = affiliateTrackingUpdateSchema.safeParse(await c.req.json());
  if (!body.success) return fail(c, 400, "Invalid tracking data");

  const row = await updateAffiliateTracking(
    shopId,
    body.data.trackingStatus,
    body.data.trackingNote,
  );
  if (!row) return fail(c, 404, "Scan not found");
  return ok(c, row);
});

// DELETE /api/admin/affiliate/scans/:shopId
affiliateRoutes.delete("/affiliate/scans/:shopId", async (c) => {
  const shopId = parseId(c.req.param("shopId"));
  if (!shopId) return fail(c, 400, "Invalid shop id");
  await deleteAffiliateScan(shopId);
  return ok(c, { message: "Scan deleted" });
});

// POST /api/admin/affiliate/scan - batch scan
affiliateRoutes.post("/affiliate/scan", async (c) => {
  if (getActiveBatchJobId() !== null) {
    return fail(c, 409, "A batch scan is already running");
  }

  const body = affiliateBatchScanSchema.safeParse(await c.req.json());
  if (!body.success) return fail(c, 400, "Invalid request body");

  const adminId = c.get("adminId");
  const job = await startBatchScan(body.data.shopIds, adminId);
  return ok(c, job, 201);
});

// POST /api/admin/affiliate/scan/:shopId - single scan
affiliateRoutes.post("/affiliate/scan/:shopId", async (c) => {
  const shopId = parseId(c.req.param("shopId"));
  if (!shopId) return fail(c, 400, "Invalid shop id");

  const allShops = await getAllShopIdsAndNames();
  const shop = allShops.find((s) => s.id === shopId);
  if (!shop) return fail(c, 404, "Shop not found");

  const adminId = c.get("adminId");
  const result = await runSingleScan(shopId, shop.name, shop.url, adminId);
  return ok(c, result);
});

// GET /api/admin/affiliate/jobs/:id
affiliateRoutes.get("/affiliate/jobs/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid job id");

  const job = await getAffiliateScanJob(id);
  if (!job) return fail(c, 404, "Job not found");
  return ok(c, job);
});

// POST /api/admin/affiliate/jobs/:id/cancel
affiliateRoutes.post("/affiliate/jobs/:id/cancel", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid job id");

  const cancelled = await cancelBatchScan(id);
  if (!cancelled) return fail(c, 404, "No active batch with this id");
  return ok(c, { message: "Cancellation requested" });
});

// POST /api/admin/affiliate/import
affiliateRoutes.post("/affiliate/import", async (c) => {
  const body = affiliateImportSchema.safeParse(await c.req.json());
  if (!body.success) return fail(c, 400, "Invalid import data");

  const allShops = await getAllShopIdsAndNames();
  const adminId = c.get("adminId");
  let imported = 0;
  let skipped = 0;

  for (const item of body.data) {
    const shop = allShops.find(
      (s) => s.url === item.shopUrl || s.name.toLowerCase() === item.shopName.toLowerCase(),
    );
    if (!shop) {
      skipped++;
      continue;
    }

    await upsertAffiliateScan({
      shopId: shop.id,
      status: item.status,
      programFound: item.programFound,
      programType: item.programType ?? null,
      programUrl: item.programUrl ?? null,
      networkName: item.networkName ?? null,
      compensationModel: item.compensationModel ?? null,
      commission: item.commission ?? null,
      cookieDuration: item.cookieDuration ?? null,
      payoutThreshold: item.payoutThreshold ?? null,
      applicationUrl: item.applicationUrl ?? null,
      contactEmail: item.contactEmail ?? null,
      requirements: item.requirements ?? null,
      notes: item.notes ?? null,
      recommendation: item.recommendation ?? null,
      scannedBy: adminId,
    });
    imported++;
  }

  return ok(c, { imported, skipped });
});

// GET /api/admin/affiliate/export
affiliateRoutes.get("/affiliate/export", async (c) => {
  const rows = await exportAllAffiliateScans();
  return c.json(rows);
});

// GET /api/admin/affiliate/health
affiliateRoutes.get("/affiliate/health", async (c) => {
  const available = await checkOllamaHealth();
  return ok(c, { available });
});
