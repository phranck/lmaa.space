import { z } from "zod";
import {
  defaultRegionArraySchema,
  submissionReviewStatusSchema,
  submissionStatusSchema,
} from "./common";

/**
 * Admin moderation payload contract for reviewing a submission.
 */
export const reviewSchema = z.object({
  status: submissionReviewStatusSchema,
  adminNote: z.string().max(500).optional(),
  rejectionLongText: z.string().max(10000).optional(),
});

/**
 * Admin edit payload contract for submission updates.
 */
export const submissionEditSchema = z.object({
  shopName: z.string().min(1).max(200),
  shopUrl: z.string().url(),
  description: z.string().max(2000).optional(),
  region: defaultRegionArraySchema,
  shipping: z.string().max(200).optional(),
  categoryIds: z.array(z.number().int().positive()),
});

/**
 * Submission status filter schema for list endpoints.
 */
export const submissionStatusFilterSchema = submissionStatusSchema;
