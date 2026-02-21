export interface Shop {
  id: number;
  name: string;
  url: string;
  categoryId: number;
  categorySlug?: string;
  categoryName?: string;
  region: string;
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
  categoryId: number;
  region?: string;
  pickup?: string;
  shipping?: string;
  description?: string;
}

export type ShopUpdate = Partial<ShopCreate> & { isActive?: boolean };
