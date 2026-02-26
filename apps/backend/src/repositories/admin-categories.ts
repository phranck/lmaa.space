import { count, eq, getTableColumns } from "drizzle-orm";
import { db } from "../db/index.js";
import { type Category, categories, shopCategories, shops } from "../db/schema.js";

export type AdminCategorySummary = Category & { shopCount: number };

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

export type UpdateAdminCategoryData = Partial<CreateAdminCategoryData>;

export async function listAdminCategories(): Promise<AdminCategorySummary[]> {
  return db
    .select({ ...getTableColumns(categories), shopCount: count(shops.id) })
    .from(categories)
    .leftJoin(shopCategories, eq(shopCategories.categoryId, categories.id))
    .leftJoin(shops, eq(shops.id, shopCategories.shopId))
    .groupBy(categories.id)
    .orderBy(categories.name);
}

export async function createAdminCategory(data: CreateAdminCategoryData): Promise<Category> {
  const [category] = await db.insert(categories).values(data).returning();
  return category;
}

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

export async function deleteAdminCategory(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function categoryExists(id: number): Promise<boolean> {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id));
  return Boolean(category);
}

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

export async function clearAdminCategoryImage(id: number): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set({
      imageUrl: null,
      imagePhotographer: null,
      imagePhotographerUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}
