import type { RegionCode, ShopVisibility } from "../constants/domain.js";

/**
 * Category subset embedded into shop responses.
 */
export interface ShopCategory {
  id: number;
  slug: string;
  name: string;
}

/**
 * Compact shop representation for tables and cards.
 */
export interface ShopSummary {
  id: number;
  name: string;
  url: string;
  categories: ShopCategory[];
  region: RegionCode[];
  visibility: ShopVisibility;
  deleteReason?: string | null;
  deletedWasReported?: boolean;
  deletedAt?: string | null;
  deletedByUsername?: string | null;
  deletedByFirstName?: string | null;
  deletedByLastName?: string | null;
}

/**
 * Full public shop model.
 */
export interface Shop {
  id: number;
  name: string;
  url: string;
  categories: ShopCategory[];
  region: RegionCode[];
  pickup: string;
  shipping: string;
  description: string;
  ogImage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a new shop.
 */
export interface ShopCreate {
  name: string;
  url: string;
  categoryIds: number[];
  region?: RegionCode[];
  pickup?: string;
  shipping?: string;
  description?: string;
}

/**
 * Partial update payload for editing a shop.
 */
export type ShopUpdate = Partial<ShopCreate> & { isActive?: boolean };
