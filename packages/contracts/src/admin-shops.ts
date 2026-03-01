import { z } from "zod";
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
  isActive: z.boolean().optional(),
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
 */
export const visibilityUpdateSchema = z.object({ visibility: shopMutableVisibilitySchema });

/**
 * Delete reason update payload contract.
 */
export const deleteReasonUpdateSchema = z.object({
  reason: z.string().max(2000).nullable(),
});
