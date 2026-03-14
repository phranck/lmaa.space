import { z } from "zod";

import { socialMediaSchema } from "@lmaa/shared";

import {
  defaultRegionArraySchema,
  submissionReviewStatusSchema,
  submissionStatusSchema,
} from "./common";

const headquartersSchema = z.object({
  street: z.string().max(200).optional(),
  postalCode: z.string().max(32).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  countryCode: z.string().trim().min(2).max(2).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

const shopCheckNotesSchema = z.object({
  focus: z.array(z.string().trim().min(1).max(200)).optional().default([]),
  brandsOrProducts: z.array(z.string().trim().min(1).max(200)).optional().default([]),
  companyPresentation: z.preprocess(
    (v) => (v === "" || typeof v === "undefined" ? null : v),
    z.string().max(4000).nullable(),
  ),
});

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
  description: z.string().optional(),
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
  headquarters: headquartersSchema.optional(),
  shopCheckNotes: shopCheckNotesSchema.nullable().optional(),
  socialMedia: socialMediaSchema,
});

/**
 * Submission status filter schema for list endpoints.
 */
export const submissionStatusFilterSchema = submissionStatusSchema;
