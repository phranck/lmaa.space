import { z } from "zod";

import {
  REGION_CODES,
  SHOP_MUTABLE_VISIBILITIES,
  SHOP_VISIBILITIES,
  SUBMISSION_REVIEW_STATUSES,
  SUBMISSION_STATUSES,
} from "@lmaa/shared";

/**
 * Region code validator shared by public and admin routes.
 */
export const regionCodeSchema = z.enum(REGION_CODES);

/**
 * Region list validator for payloads that accept multiple target regions.
 */
export const regionArraySchema = z.array(regionCodeSchema);

/**
 * Optional region list validator.
 */
export const optionalRegionArraySchema = regionArraySchema.optional();

/**
 * Region list validator defaulting to an empty array.
 */
export const defaultRegionArraySchema = optionalRegionArraySchema.default([]);

/**
 * Submission status validator for filters and route parameters.
 */
export const submissionStatusSchema = z.enum(SUBMISSION_STATUSES);

/**
 * Submission review outcome validator.
 */
export const submissionReviewStatusSchema = z.enum(SUBMISSION_REVIEW_STATUSES);

/**
 * Full shop visibility validator.
 */
export const shopVisibilitySchema = z.enum(SHOP_VISIBILITIES);

/**
 * Mutable shop visibility validator (excludes hard-delete state).
 */
export const shopMutableVisibilitySchema = z.enum(SHOP_MUTABLE_VISIBILITIES);

/**
 * Logo background color validator.
 * Accepts a 6-digit hex color or an 8-digit hex color with alpha, prefixed
 * with `#` (e.g. `#ff00aa`, `#ff00aa80`), or null/undefined.
 */
export const logoBackgroundColorSchema = z
  .string()
  .regex(
    /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/,
    "Must be a 6-digit hex color or 8-digit hex with alpha (e.g. #ff00aa, #ff00aa80)",
  )
  .nullable()
  .optional();
