/**
 * Category entity shared by frontend, dashboard and backend responses.
 */
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
  imageFocalPointY?: number;
  shopCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category plus resolved shop relations for detail views.
 */
export interface CategoryWithShops extends Category {
  shops: import("./shop.js").Shop[];
}
