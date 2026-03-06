import { z } from "zod";

import { socialMediaSchema } from "@lmaa/shared";

import {
  defaultRegionArraySchema,
  optionalRegionArraySchema,
  shopMutableVisibilitySchema,
  shopVisibilitySchema,
} from "./common";

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
  description: z.string().max(2000).optional(),
  contactEmail: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email().max(200).optional(),
  ),
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
  description: z.string().max(2000).optional(),
  contactEmail: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email().max(200).optional(),
  ),
  socialMedia: socialMediaSchema,
});

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
 * When setting `rejected`, optionally pass `rejectionToken` and `rejectionLongText`.
 */
export const visibilityUpdateSchema = z.object({
  visibility: shopMutableVisibilitySchema,
  rejectionToken: z.string().optional(),
  rejectionLongText: z.string().nullable().optional(),
});

/**
 * Delete reason update payload contract.
 */
export const deleteReasonUpdateSchema = z.object({
  reason: z.string().max(2000).nullable(),
});

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
