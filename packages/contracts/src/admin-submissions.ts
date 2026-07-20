import { z } from "zod";

import { socialMediaSchema } from "@lmaa/shared";

import { paymentMethodsSchema, shopCheckNotesSchema, shopJsonSchema } from "./admin-shops";
import {
  defaultRegionArraySchema,
  logoBackgroundColorSchema,
  submissionReviewStatusSchema,
  submissionStatusSchema,
} from "./common";
import { isSafeConfiguredUrl } from "./safe-url";

const headquartersSchema = z.object({
  street: z.string().max(200).optional(),
  postalCode: z.string().max(32).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  countryCode: z.string().trim().min(2).max(2).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

/**
 * Admin moderation payload contract for reviewing a submission.
 */
export const reviewSchema = z.object({
  status: submissionReviewStatusSchema,
  adminNote: z.string().optional(),
  rejectionLongText: z.string().optional(),
  rejectionToken: z
    .string()
    .regex(/^[0-9a-f]{32}$/)
    .optional(),
  notificationTemplateId: z.number().int().positive().optional(),
  templateAssignments: z
    .array(
      z.object({
        accountId: z.number().int().positive(),
        templateId: z.number().int().positive().nullable(),
      }),
    )
    .optional(),
});

/**
 * Admin edit payload contract for submission updates.
 */
export const submissionEditSchema = z.object({
  shopName: z.string().min(1).max(200),
  shopUrl: z
    .string()
    .url()
    .refine((value) => isSafeConfiguredUrl(value), "URL must be a public http(s) address"),
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
  shopCheckNotes: shopCheckNotesSchema.optional(),
  socialMedia: socialMediaSchema,
  paymentMethods: paymentMethodsSchema.optional(),
  logoBackgroundColor: logoBackgroundColorSchema,
});

/**
 * Submission status filter schema for list endpoints.
 */
export const submissionStatusFilterSchema = submissionStatusSchema;

/**
 * Shopcheck review-results import payload for bulk submission updates.
 * Each entry is a raw shopJson object with an embedded submissionId.
 */
export const submissionReviewImportSchema = z.array(
  shopJsonSchema.extend({ submissionId: z.number().int().positive() }),
);
