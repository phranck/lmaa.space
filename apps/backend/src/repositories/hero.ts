import { asc, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { type HeroImage, heroImages } from "../db/schema.js";

/**
 * Lists all hero images ordered by sort_order, then id.
 */
export async function listHeroImages(): Promise<HeroImage[]> {
  return db.select().from(heroImages).orderBy(asc(heroImages.sortOrder), asc(heroImages.id));
}

/**
 * Lists only hero images marked as selected for rotation.
 */
export async function listSelectedHeroImages(): Promise<HeroImage[]> {
  return db
    .select()
    .from(heroImages)
    .where(eq(heroImages.isSelected, true))
    .orderBy(asc(heroImages.sortOrder), asc(heroImages.id));
}

/**
 * Adds a new hero image to the pool.
 */
export async function createHeroImage(data: {
  url: string;
  photographer: string;
  photographerUrl: string;
  downloadLocation: string;
}): Promise<HeroImage> {
  const [row] = await db.insert(heroImages).values(data).returning();
  return row;
}

/**
 * Deletes a hero image by id.
 */
export async function deleteHeroImage(id: number): Promise<void> {
  await db.delete(heroImages).where(eq(heroImages.id, id));
}

/**
 * Deselects all hero images (used for single-active mode).
 */
export async function clearHeroImageSelections(): Promise<void> {
  await db.update(heroImages).set({ isSelected: false });
}

/**
 * Sets the `isSelected` flag on a hero image.
 */
export async function setHeroImageSelected(id: number, selected: boolean): Promise<HeroImage> {
  const [row] = await db
    .update(heroImages)
    .set({ isSelected: selected })
    .where(eq(heroImages.id, id))
    .returning();
  return row;
}

/**
 * Sets the focal point Y position (0–100) on a hero image.
 */
export async function setHeroImageFocalPoint(id: number, focalPointY: number): Promise<HeroImage> {
  const [row] = await db
    .update(heroImages)
    .set({ focalPointY })
    .where(eq(heroImages.id, id))
    .returning();
  return row;
}
