export interface ShopCategory {
  id: number;
  slug: string;
  name: string;
}

export interface Shop {
  id: number;
  name: string;
  url: string;
  categories: ShopCategory[];
  region: string[];
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
  region?: string[];
  pickup?: string;
  shipping?: string;
  description?: string;
}

export type ShopUpdate = Partial<ShopCreate> & { isActive?: boolean };
