import {
  REGION_CODES,
  SHOP_MUTABLE_VISIBILITIES,
  SHOP_VISIBILITIES,
  SUBMISSION_REVIEW_STATUSES,
  SUBMISSION_STATUSES,
} from "@lmaa/shared";
import { z } from "zod";

export const regionCodeSchema = z.enum(REGION_CODES);
export const regionArraySchema = z.array(regionCodeSchema);
export const optionalRegionArraySchema = regionArraySchema.optional();
export const defaultRegionArraySchema = optionalRegionArraySchema.default([]);

export const submissionStatusSchema = z.enum(SUBMISSION_STATUSES);
export const submissionReviewStatusSchema = z.enum(SUBMISSION_REVIEW_STATUSES);
export const shopVisibilitySchema = z.enum(SHOP_VISIBILITIES);
export const shopMutableVisibilitySchema = z.enum(SHOP_MUTABLE_VISIBILITIES);
