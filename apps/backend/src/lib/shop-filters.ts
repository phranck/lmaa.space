import { z } from "zod";

/**
 * Zod schema for public shop filter query parameters.
 * Shared across all filterable endpoints.
 */
export const shopFilterSchema = z.object({
  city: z.string().max(200).optional(),
  radius: z.coerce.number().int().min(1).max(500).optional(),
  country: z.string().length(2).toUpperCase().optional(),
  region: z.string().max(50).optional(),
});

export type ShopFilterParams = z.infer<typeof shopFilterSchema>;

/**
 * Parses comma-separated region codes into an array.
 */
export function parseRegionFilter(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
}
