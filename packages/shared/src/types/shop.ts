import type { RegionCode, ShopVisibility } from "../constants/domain.js";

/**
 * Normalized headquarters/address snapshot exposed through API models.
 */
export interface ShopHeadquarters {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
}

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
  rejectionToken?: string | null;
  rejectionAdminNote?: string | null;
  rejectionLongText?: string | null;
}

/**
 * Admin list item with enough data to open the editor without a blocking detail fetch.
 */
export interface AdminShopListItem extends ShopSummary {
  description: string;
  shipping: string;
  contactEmail?: string | null;
  socialMedia: Record<string, string>;
  ogImage?: string | null;
  headquarters?: ShopHeadquarters | null;

  needsReview: boolean;
  reviewData?: Record<string, unknown> | null;
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
  contactEmail?: string | null;
  socialMedia: Record<string, string>;
  visibility: ShopVisibility;
  /** @deprecated Legacy field, always `true`. Use `visibility` instead. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rejectionToken?: string | null;
  rejectionAdminNote?: string | null;
  rejectionLongText?: string | null;
  headquarters?: ShopHeadquarters | null;

  needsReview: boolean;
  reviewData?: Record<string, unknown> | null;
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
  contactEmail?: string;
  headquarters?: Partial<ShopHeadquarters> | null;

}

/**
 * Partial update payload for editing a shop.
 */
export type ShopUpdate = Partial<ShopCreate>;
