/**
 * Affiliate scan status indicating the type of program found.
 */
export type AffiliateScanStatus = "direct" | "network" | "inquiry" | "none";

/**
 * Tracking status for outreach follow-up.
 */
export type AffiliateTrackingStatus =
  | "open"
  | "contacted"
  | "confirmed"
  | "rejected";

/**
 * Batch scan job status.
 */
export type AffiliateScanJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Affiliate scan result for a single shop.
 */
export interface AffiliateScanResult {
  id: number;
  shopId: number;
  shopName: string;
  shopUrl: string;
  status: AffiliateScanStatus;
  programFound: boolean;
  programType: string | null;
  programUrl: string | null;
  networkName: string | null;
  compensationModel: string | null;
  commission: string | null;
  cookieDuration: string | null;
  payoutThreshold: string | null;
  applicationUrl: string | null;
  contactEmail: string | null;
  requirements: string | null;
  notes: string | null;
  recommendation: string | null;
  trackingStatus: AffiliateTrackingStatus;
  trackingNote: string | null;
  scannedAt: string;
  scannedBy: number | null;
  updatedAt: string;
}

/**
 * Batch scan job progress.
 */
export interface AffiliateScanJob {
  id: number;
  status: AffiliateScanJobStatus;
  totalShops: number;
  completedShops: number;
  failedShops: number;
  errors: AffiliateScanJobError[];
  startedBy: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AffiliateScanJobError {
  shopId: number;
  shopName: string;
  error: string;
}

/**
 * Aggregated affiliate scan statistics.
 */
export interface AffiliateScanStats {
  total: number;
  byStatus: Record<AffiliateScanStatus, number>;
  byTracking: Record<AffiliateTrackingStatus, number>;
  withProgram: number;
  withoutProgram: number;
}
