import { count, eq, getTableColumns } from "drizzle-orm";

import { db } from "../db/index.js";
import { type Category, categories, shopCategories, shops } from "../db/schema.js";

/**
 * Category row enriched with the number of linked shops.
 */
type AdminCategorySummary = Category & { shopCount: number };

/**
 * Mutable attributes accepted when creating a category.
 */
export interface CreateAdminCategoryData {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  sortOrder?: number;
  imageUrl?: string | null;
  imagePhotographer?: string | null;
  imagePhotographerUrl?: string | null;
}

/**
 * Partial update payload for existing categories.
 */
export type UpdateAdminCategoryData = Partial<CreateAdminCategoryData>;

/**
 * Lists all categories including current shop usage.
 *
 * @returns Categories ordered by name with aggregated `shopCount`.
 */
export async function listAdminCategories(): Promise<AdminCategorySummary[]> {
  return db
    .select({ ...getTableColumns(categories), shopCount: count(shops.id) })
    .from(categories)
    .leftJoin(shopCategories, eq(shopCategories.categoryId, categories.id))
    .leftJoin(shops, eq(shops.id, shopCategories.shopId))
    .groupBy(categories.id)
    .orderBy(categories.name);
}

/**
 * Creates a new category entry.
 *
 * @param data - Fully validated category attributes from admin APIs.
 * @returns Inserted category record.
 */
export async function createAdminCategory(data: CreateAdminCategoryData): Promise<Category> {
  const [category] = await db.insert(categories).values(data).returning();
  return category;
}

/**
 * Updates an existing category and refreshes `updatedAt`.
 *
 * @param id - Category id.
 * @param data - Partial category patch.
 * @returns Updated category or `null` if not found.
 */
export async function updateAdminCategory(
  id: number,
  data: UpdateAdminCategoryData,
): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

/**
 * Permanently deletes a category.
 *
 * @param id - Category id to remove.
 * @returns Resolves when delete finished.
 */
export async function deleteAdminCategory(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

/**
 * Checks whether a category id exists.
 *
 * @param id - Category id to test.
 * @returns `true` if a row exists.
 */
export async function categoryExists(id: number): Promise<boolean> {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return Boolean(category);
}

export async function getCategoryUnsplashImageId(id: number): Promise<number | null> {
  const [row] = await db
    .select({ unsplashImageId: categories.unsplashImageId })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return row?.unsplashImageId ?? null;
}

/**
 * Sets a direct category image URL and clears attribution fields.
 *
 * Hidden behavior: image credits are reset because manual uploads do not carry
 * Unsplash attribution metadata.
 *
 * @param id - Category id.
 * @param imageUrl - Public URL of the stored image.
 * @returns Updated category or `null` if the category does not exist.
 */
export async function setAdminCategoryImage(
  id: number,
  imageUrl: string,
): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set({
      imageUrl,
      imagePhotographer: null,
      imagePhotographerUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

/**
 * Sets an Unsplash image on a category via FK and attribution fields.
 */
export async function setAdminCategoryUnsplashImage(
  id: number,
  data: {
    unsplashImageId: number;
    imageUrl: string;
    imagePhotographer: string;
    imagePhotographerUrl: string;
  },
): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set({
      unsplashImageId: data.unsplashImageId,
      imageUrl: data.imageUrl,
      imagePhotographer: data.imagePhotographer,
      imagePhotographerUrl: data.imagePhotographerUrl,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

/**
 * Removes image and attribution metadata from a category.
 *
 * @param id - Category id.
 * @returns Updated category or `null` when the id is unknown.
 */
export async function clearAdminCategoryImage(id: number): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set({
      imageUrl: null,
      imagePhotographer: null,
      imagePhotographerUrl: null,
      unsplashImageId: null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}
