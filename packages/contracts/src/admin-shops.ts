import { z } from "zod";

import { socialMediaSchema } from "@lmaa/shared";

import {
  defaultRegionArraySchema,
  logoBackgroundColorSchema,
  optionalRegionArraySchema,
  shopMutableVisibilitySchema,
  shopVisibilitySchema,
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

export const shopCheckNotesSchema = z
  .object({
    focus: z.array(z.string().trim().min(1)).optional(),
    brandsOrProducts: z.array(z.string().trim().min(1)).optional(),
    companyPresentation: z.string().trim().nullable().optional(),
  })
  .nullable();

/**
 * Shop create payload contract for admin routes.
 */
export const shopBodySchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  region: defaultRegionArraySchema,
  pickup: z.string().optional(),
  shipping: z.string().optional(),
  description: z.string().optional(),
  contactEmail: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email().max(200).optional(),
  ),
  headquarters: headquartersSchema.optional(),
  shopCheckNotes: shopCheckNotesSchema.optional(),
  socialMedia: socialMediaSchema,
});

/**
 * Shop partial update payload contract for admin routes.
 */
export const shopUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  region: optionalRegionArraySchema,
  pickup: z.string().optional(),
  shipping: z.string().optional(),
  description: z.string().optional(),
  contactEmail: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email().max(200).optional(),
  ),
  headquarters: headquartersSchema.optional(),
  shopCheckNotes: shopCheckNotesSchema.optional(),
  socialMedia: socialMediaSchema,
  logoBackgroundColor: logoBackgroundColorSchema,
  needsReview: z.boolean().optional(),
});

const shopJsonSchema = z.object({
  name: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  contactEmail: z.string().nullable().optional(),
  shippingRegions: z.array(z.string()).optional(),
  headquarters: z
    .object({
      street: z.string().nullable().optional(),
      postalCode: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      countryCode: z.string().nullable().optional(),
    })
    .optional(),
  geo: z
    .object({
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .optional(),
  socialMedia: z.record(z.string().nullable()).optional(),
  notes: z
    .object({
      focus: z.array(z.string()).optional(),
      brandsOrProducts: z.array(z.string()).optional(),
      companyPresentation: z.string().nullable().optional(),
    })
    .optional(),
});

/**
 * Shared shopJson schema used by both shop and submission import routes.
 */
export { shopJsonSchema };

/**
 * Shopcheck review-results import payload for bulk shop updates.
 * Each entry is a raw shopJson object produced by the shopcheck tool,
 * identified by shopId for direct matching.
 */
export const shopcheckImportSchema = z.array(
  shopJsonSchema.extend({ shopId: z.number().int().positive() }),
);

/**
 * URL preview payload contract used to validate and fetch OG previews.
 */
export const previewImageSchema = z.object({ url: z.string().url() });

/**
 * Shop visibility filter schema for list endpoints.
 */
export const visibilityFilterSchema = shopVisibilitySchema;

/**
 * Visibility update payload contract for mutable visibility transitions.
 * When setting `rejected`, optionally pass `rejectionToken`, `rejectionAdminNote`
 * and `rejectionLongText`.
 */
export const visibilityUpdateSchema = z.object({
  visibility: shopMutableVisibilitySchema,
  rejectionToken: z.string().optional(),
  rejectionAdminNote: z.string().nullable().optional(),
  rejectionLongText: z.string().nullable().optional(),
});

/**
 * Delete reason update payload contract.
 */
export const deleteReasonUpdateSchema = z.object({
  reason: z.string().max(2000).nullable(),
});

/** OG image update payload contract for the shop detail admin route. */
export const ogImageUpdateSchema = z.object({
  ogImage: z.string().nullable(),
});

/**
 * Shop delete payload contract for admin DELETE routes.
 */
export const shopDeleteBodySchema = z.object({
  reason: z.string().max(2000).optional().nullable(),
  wasReported: z.boolean().optional().default(false),
  mode: z.enum(["delete", "mark_deleted"]).optional().default("mark_deleted"),
});
