export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  sortOrder: number;
  imageUrl?: string | null;
  imagePhotographer?: string | null;
  imagePhotographerUrl?: string | null;
  shopCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithShops extends Category {
  shops: import("./shop.js").Shop[];
}
