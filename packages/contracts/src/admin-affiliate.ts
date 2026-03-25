import { z } from "zod";

const affiliateScanStatusSchema = z.enum([
  "direct",
  "network",
  "inquiry",
  "none",
]);

const affiliateTrackingStatusSchema = z.enum([
  "open",
  "contacted",
  "confirmed",
  "rejected",
  "closed",
]);

/**
 * Filters for listing affiliate scans.
 */
export const affiliateScansQuerySchema = z.object({
  status: affiliateScanStatusSchema.optional(),
  tracking: affiliateTrackingStatusSchema.optional(),
  network: z.string().optional(),
  search: z.string().optional(),
});

/**
 * Update tracking status and note for a scan result.
 */
export const affiliateTrackingUpdateSchema = z.object({
  trackingStatus: affiliateTrackingStatusSchema,
  trackingNote: z.string().max(2000).nullable().optional(),
});

/**
 * Trigger a batch scan for specific or all shops.
 */
export const affiliateBatchScanSchema = z.object({
  shopIds: z.array(z.number().int().positive()).optional(),
});

/**
 * Import scan data from external JSON.
 */
export const affiliateImportItemSchema = z.object({
  shopName: z.string().min(1),
  shopUrl: z.string().url(),
  status: affiliateScanStatusSchema,
  programFound: z.boolean(),
  programType: z.string().nullable().optional(),
  programUrl: z.string().nullable().optional(),
  networkName: z.string().nullable().optional(),
  compensationModel: z.string().nullable().optional(),
  commission: z.string().nullable().optional(),
  cookieDuration: z.string().nullable().optional(),
  payoutThreshold: z.string().nullable().optional(),
  applicationUrl: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  requirements: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  recommendation: z.string().nullable().optional(),
  trackingStatus: affiliateTrackingStatusSchema.optional(),
  trackingNote: z.string().nullable().optional(),
});

/** Array of import items for bulk affiliate scan import. */
export const affiliateImportSchema = z.array(affiliateImportItemSchema);
