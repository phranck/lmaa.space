import { z } from "zod";

import { defaultRegionArraySchema } from "./common";

export const PUBLIC_REJECTED_SHOP_PAGE_SIZES = ["10", "15", "20", "30", "50", "all"] as const;
export const PUBLIC_REJECTED_SHOP_DEFAULT_PAGE_SIZE = "15";
export const PUBLIC_REJECTED_SHOP_SORT_FIELDS = ["shopName", "submittedAt", "rejectedAt"] as const;
export type PublicRejectedShopPageSize = (typeof PUBLIC_REJECTED_SHOP_PAGE_SIZES)[number];
export type PublicRejectedShopSortField = (typeof PUBLIC_REJECTED_SHOP_SORT_FIELDS)[number];
export type PublicRejectedShopSortDirection = "asc" | "desc";

/**
 * Public submission payload contract (`POST /api/submissions`).
 */
export const submissionSchema = z.object({
  shopName: z.string().min(2).max(100),
  shopUrl: z.string().url(),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  categorySuggestion: z.string().max(100).optional(),
  region: defaultRegionArraySchema,
  shipping: z.string().max(200).optional(),
  description: z.string().optional(),
  submitterEmail: z.string().email().optional(),
  submitterNote: z.string().max(500).optional(),
});

export interface PublicRejectedShopEntry {
  id: string;
  shopName: string;
  submittedAt: string;
  rejectedAt: string;
  rejectionUrl: string;
}

export interface PublicRejectedShopsResponse {
  entries: PublicRejectedShopEntry[];
  total: number;
  page: number;
  pageSize: PublicRejectedShopPageSize;
  search: string;
  sortBy: PublicRejectedShopSortField;
  sortDir: PublicRejectedShopSortDirection;
  metrics: {
    totalRejectedShops: number;
    filteredRejectedShops: number;
  };
}
