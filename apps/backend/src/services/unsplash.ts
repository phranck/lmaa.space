import { env } from "../config/env.js";
import { HttpError } from "../lib/http.js";

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
}

type UnsplashSearchResult = {
  results: Array<{
    id: string;
    urls: { small: string; regular: string };
    user: { name: string; link: string };
    downloadLocation: string;
  }>;
  total: number;
};

function getUnsplashApiKey() {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new HttpError(503, "Unsplash not configured");
  }
  return key;
}

/**
 * Searches Unsplash and returns normalized payload for admin media picker.
 *
 * @param query - Search phrase.
 * @param page - 1-based page number as string.
 * @param orientation - Optional orientation filter: landscape | portrait | squarish.
 * @param orderBy - Optional sort order: relevant | latest.
 * @param color - Optional dominant color filter.
 * @returns Normalized search payload with `results` and `total`.
 * @throws {HttpError} When Unsplash is not configured or request fails.
 */
export async function searchUnsplashPhotos(
  query: string,
  page = "1",
  orientation?: string,
  orderBy?: string,
  color?: string,
): Promise<UnsplashSearchResult> {
  if (!query) return { results: [], total: 0 };

  const key = getUnsplashApiKey();
  const params = new URLSearchParams({ query, per_page: "30", page });
  if (orientation) params.set("orientation", orientation);
  if (orderBy) params.set("order_by", orderBy);
  if (color) params.set("color", color);
  const url = `https://api.unsplash.com/search/photos?${params.toString()}`;
  const response = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });

  if (!response.ok) {
    throw new HttpError(502, "Unsplash request failed");
  }

  const payload = (await response.json()) as { results: UnsplashPhoto[]; total: number };
  return {
    total: payload.total,
    results: payload.results.map((photo) => ({
      id: photo.id,
      urls: { small: photo.urls.small, regular: photo.urls.regular },
      user: { name: photo.user.name, link: photo.user.links.html },
      downloadLocation: photo.links.download_location,
    })),
  };
}

/**
 * Calls Unsplash download-tracking endpoint.
 *
 * @param downloadLocation - Unsplash-provided tracking endpoint URL.
 * @returns `true` when request was attempted with configured API key; otherwise `false`.
 */
export async function triggerUnsplashDownload(downloadLocation: string): Promise<boolean> {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) return false;

  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
  return true;
}
