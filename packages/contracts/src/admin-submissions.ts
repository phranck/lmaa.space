import { z } from "zod";

import { socialMediaSchema } from "@lmaa/shared";

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
  adminNote: z.string().max(1200).optional(),
  rejectionLongText: z.string().optional(),
  rejectionToken: z
    .string()
    .regex(/^[0-9a-f]{32}$/)
    .optional(),
});

/**
 * Admin edit payload contract for submission updates.
 */
export const submissionEditSchema = z.object({
  shopName: z.string().min(1).max(200),
  shopUrl: z.string().url(),
  description: z.string().max(2000).optional(),
  ogImage: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url().max(2000).nullable().optional(),
  ),
  region: defaultRegionArraySchema,
  shipping: z.string().max(200).optional(),
  categoryIds: z.array(z.number().int().positive()),
  contactEmail: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email().max(200).optional(),
  ),
  socialMedia: socialMediaSchema,
});

/**
 * Submission status filter schema for list endpoints.
 */
export const submissionStatusFilterSchema = submissionStatusSchema;
