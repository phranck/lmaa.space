export interface Category {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  shopCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithShops extends Category {
  shops: import("./shop.js").Shop[];
}
