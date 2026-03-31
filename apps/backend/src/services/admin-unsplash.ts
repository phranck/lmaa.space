import { searchUnsplashPhotos, triggerUnsplashDownload } from "./unsplash.js";

/**
 * Proxy helper for searching Unsplash photos in admin UI.
 *
 * @param query - Search term.
 * @param page - 1-based result page.
 * @param orientation - Optional orientation filter.
 * @param orderBy - Optional sort order.
 * @param color - Optional dominant color filter.
 * @returns Normalized Unsplash search payload.
 */
export async function searchManagedUnsplashPhotos(
  query: string,
  page: string,
  orientation?: string,
  orderBy?: string,
  color?: string,
) {
  return searchUnsplashPhotos(query, page, orientation, orderBy, color);
}

/**
 * Triggers Unsplash download tracking endpoint.
 *
 * @param downloadLocation - Unsplash `download_location` URL.
 * @returns `{ ok: boolean }` indicating whether tracking call was attempted.
 */
export async function triggerManagedUnsplashDownload(downloadLocation: string) {
  const ok = await triggerUnsplashDownload(downloadLocation);
  return { ok };
}
