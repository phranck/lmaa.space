import { z } from "zod";
import {
  defaultRegionArraySchema,
  optionalRegionArraySchema,
  shopMutableVisibilitySchema,
  shopVisibilitySchema,
} from "./common";

export const shopBodySchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  region: defaultRegionArraySchema,
  pickup: z.string().optional(),
  shipping: z.string().optional(),
  description: z.string().max(2000).optional(),
});

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

export const previewImageSchema = z.object({ url: z.string().url() });
export const visibilityFilterSchema = shopVisibilitySchema;
export const visibilityUpdateSchema = z.object({ visibility: shopMutableVisibilitySchema });
