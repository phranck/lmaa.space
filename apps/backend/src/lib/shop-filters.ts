import { z } from "zod";

/**
 * Zod schema for public shop filter query parameters.
 * Shared across all filterable endpoints.
 */
export const shopFilterSchema = z.object({
  city: z.string().max(200).optional(),
  radius: z.coerce.number().int().min(1).max(500).optional(),
  country: z.string().max(50).optional(),
  region: z.string().max(50).optional(),
});

/** Inferred TypeScript type for parsed shop filter query parameters. */
export type ShopFilterParams = z.infer<typeof shopFilterSchema>;

/**
 * Parses comma-separated region codes into an array.
 */
export function parseRegionFilter(raw: string | undefined): string[] {
  if (!raw) return [];
  const regions: string[] = [];
  for (const value of raw.split(",")) {
    const region = value.trim().toUpperCase();
    if (region) regions.push(region);
  }
  return regions;
}

/**
 * Parses comma-separated country codes into an array.
 */
export function parseCountryFilter(raw: string | undefined): string[] {
  if (!raw) return [];
  const countries: string[] = [];
  for (const value of raw.split(",")) {
    const country = value.trim().toUpperCase();
    if (country.length === 2) countries.push(country);
  }
  return countries;
}
