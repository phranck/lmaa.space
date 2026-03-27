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
  | "rejected"
  | "closed";

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
  networkProgramId: string | null;
  networkProgramUrl: string | null;
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

/**
 * Supported affiliate network identifiers.
 */
export type AffiliateNetworkId = "awin" | "tradedoubler";

/**
 * Programme/program information retrieved from a network API.
 */
export interface NetworkProgram {
  networkName: AffiliateNetworkId;
  programId: string;
  programName: string;
  programUrl: string | null;
  applicationUrl: string | null;
  status: "notJoined" | "applied" | "joined" | "declined" | "suspended";
  commissionInfo: string | null;
}

/**
 * Result of matching a shop to a network programme.
 */
export interface NetworkMatchResult {
  shopId: number;
  networkName: AffiliateNetworkId;
  matched: boolean;
  program: NetworkProgram | null;
}
