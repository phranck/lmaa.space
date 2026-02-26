import type { RegionCode, ShopVisibility } from "../constants/domain.js";

export interface ShopCategory {
  id: number;
  slug: string;
  name: string;
}

export interface ShopSummary {
  id: number;
  name: string;
  url: string;
  categories: ShopCategory[];
  region: RegionCode[];
  visibility: ShopVisibility;
  deleteReason?: string | null;
  deletedWasReported?: boolean;
  deletedByUsername?: string | null;
}

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

export interface ShopCreate {
  name: string;
  url: string;
  categoryIds: number[];
  region?: RegionCode[];
  pickup?: string;
  shipping?: string;
  description?: string;
}

export type ShopUpdate = Partial<ShopCreate> & { isActive?: boolean };
