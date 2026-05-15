import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { type UnsplashImage, type UnsplashImageInsert, unsplashImages } from "../db/schema.js";

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
