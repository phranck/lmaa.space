import type { ShopHeadquarters } from "./shop.js";
import type { RegionCode, SubmissionReviewStatus, SubmissionStatus } from "../constants/domain.js";

/**
 * Re-exported submission status unions from domain constants.
 */
export type { SubmissionReviewStatus, SubmissionStatus };

/**
 * Submission entity stored in moderation workflow.
 */
export interface Submission {
  id: number;
  shopName: string;
  shopUrl: string;
  categoryIds: number[];
  categorySuggestion: string | null;
  region: RegionCode[];
  pickup: string;
  shipping: string;
  description: string;
  ogImage: string | null;
  socialMedia: Record<string, string>;
  contactEmail: string | null;
  submitterEmail: string | null;
  submitterNote: string | null;
  status: SubmissionStatus;
  adminNote: string | null;
  rejectionLongText: string | null;
  rejectionToken: string | null;
  feedbackSent: boolean;
  reviewedBy: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  headquarters?: ShopHeadquarters | null;
}

/**
 * Payload for creating a new submission from the public suggestion form.
 */
export interface SubmissionCreate {
  shopName: string;
  shopUrl: string;
  categoryIds?: number[];
  categorySuggestion?: string;
  region?: RegionCode[];
  pickup?: string;
  shipping?: string;
  description?: string;
  submitterEmail?: string;
  submitterNote?: string;
}

/**
 * Aggregated dead-link report row grouped by shop.
 */
export interface DeadLinkReportSummary {
  shopId: number;
  shopName: string;
  shopUrl: string;
  reportCount: number;
  lastReportedAt: string | null;
}

/**
 * Single report entry for moderation of shop concerns.
 */
export interface ShopConcernReportEntry {
  id: number;
  shopId: number;
  shopName: string;
  shopUrl: string;
  reason: string;
  reportedAt: string;
}

/**
 * Moderation payload for reviewing a submission.
 */
export interface SubmissionReview {
  status: SubmissionReviewStatus;
  adminNote?: string;
  rejectionLongText?: string;
}
