import { and, eq, isNotNull, isNull, like } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  type UnsplashImage,
  type UnsplashImageInsert,
  categories,
  heroImages,
  unsplashImages,
} from "../db/schema.js";

/** List all unsplash_images rows. */
export async function listAllUnsplashImages(): Promise<UnsplashImage[]> {
  return db.select().from(unsplashImages);
}

/** Find an unsplash_images row by the Unsplash photo ID. */
export async function findByUnsplashId(unsplashId: string): Promise<UnsplashImage | undefined> {
  const [row] = await db.select().from(unsplashImages).where(eq(unsplashImages.unsplashId, unsplashId));
  return row;
}

/** Insert or update an unsplash_images row, keyed by unsplashId. Returns the row. */
export async function upsertUnsplashImage(data: UnsplashImageInsert): Promise<UnsplashImage> {
  const [row] = await db
    .insert(unsplashImages)
    .values(data)
    .onConflictDoUpdate({
      target: unsplashImages.unsplashId,
      set: {
        urlSmall: data.urlSmall,
        urlRegular: data.urlRegular,
        width: data.width,
        height: data.height,
        color: data.color,
        blurHash: data.blurHash,
        description: data.description,
        altDescription: data.altDescription,
        likes: data.likes,
        photographerName: data.photographerName,
        photographerUrl: data.photographerUrl,
        downloadLocation: data.downloadLocation,
        createdAtUnsplash: data.createdAtUnsplash,
      },
    })
    .returning();
  return row;
}

/** Update location fields after fetching /photos/:id. */
export async function updateUnsplashImageLocation(
  id: number,
  location: {
    city: string | null;
    country: string | null;
    lat: number | null;
    lng: number | null;
  },
): Promise<void> {
  await db
    .update(unsplashImages)
    .set({
      locationCity: location.city,
      locationCountry: location.country,
      locationLat: location.lat,
      locationLng: location.lng,
      locationFetched: true,
    })
    .where(eq(unsplashImages.id, id));
}

export interface UnsplashCacheSource {
  unsplashImageId: number;
  unsplashId: string;
  type: "hero" | "categorie";
  url: string;
}



interface UnlinkedCategory {
  id: number;
  imageUrl: string;
  imagePhotographerUrl: string | null;
}

/**
 * Returns categories with Unsplash image URLs but no `unsplashImageId` FK.
 */
export async function listUnlinkedUnsplashCategories(): Promise<UnlinkedCategory[]> {
  const rows = await db
    .select({
      id: categories.id,
      imageUrl: categories.imageUrl,
      imagePhotographerUrl: categories.imagePhotographerUrl,
    })
    .from(categories)
    .where(
      and(
        isNull(categories.unsplashImageId),
        isNotNull(categories.imageUrl),
        like(categories.imageUrl, "%images.unsplash.com%"),
      ),
    );

  return rows.filter((r): r is UnlinkedCategory => r.imageUrl !== null);
}

/**
 * Sets the `unsplashImageId` FK on a category row.
 */
export async function linkCategoryToUnsplashImage(categoryId: number, unsplashImageId: number): Promise<void> {
  await db
    .update(categories)
    .set({ unsplashImageId })
    .where(eq(categories.id, categoryId));
}

/** Lists all unsplash images referenced by hero_images or categories. */
export async function listUnsplashCacheSources(): Promise<UnsplashCacheSource[]> {
  const heroRows = await db
    .select({
      unsplashImageId: unsplashImages.id,
      unsplashId: unsplashImages.unsplashId,
      url: unsplashImages.urlRegular,
    })
    .from(heroImages)
    .innerJoin(unsplashImages, eq(heroImages.unsplashImageId, unsplashImages.id))
    .where(isNotNull(heroImages.unsplashImageId));

  const catRows = await db
    .select({
      unsplashImageId: unsplashImages.id,
      unsplashId: unsplashImages.unsplashId,
      url: unsplashImages.urlRegular,
    })
    .from(categories)
    .innerJoin(unsplashImages, eq(categories.unsplashImageId, unsplashImages.id))
    .where(isNotNull(categories.unsplashImageId));

  const seen = new Set<string>();
  const sources: UnsplashCacheSource[] = [];

  for (const row of heroRows) {
    const key = `hero-${row.unsplashImageId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ ...row, type: "hero" });
  }

  for (const row of catRows) {
    const key = `categorie-${row.unsplashImageId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ ...row, type: "categorie" });
  }

  return sources;
}

/** Get a single unsplash_images row by internal PK. */
export async function getUnsplashImageById(id: number): Promise<UnsplashImage | undefined> {
  const [row] = await db.select().from(unsplashImages).where(eq(unsplashImages.id, id));
  return row;
}
