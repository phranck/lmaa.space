import { env } from "../config/env.js";
import { HttpError } from "../lib/http.js";

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
  width: number;
  height: number;
  color: string | null;
  blur_hash: string | null;
  description: string | null;
  alt_description: string | null;
  likes: number;
  created_at: string;
}

interface UnsplashPhotoDetail extends UnsplashPhoto {
  location: {
    city: string | null;
    country: string | null;
    position: { latitude: number | null; longitude: number | null } | null;
  } | null;
}

export type UnsplashSearchResultItem = {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; link: string };
  downloadLocation: string;
  width: number;
  height: number;
  color: string | null;
  blurHash: string | null;
  description: string | null;
  altDescription: string | null;
  likes: number;
  createdAt: string;
};

type UnsplashSearchResult = {
  results: UnsplashSearchResultItem[];
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
      width: photo.width,
      height: photo.height,
      color: photo.color,
      blurHash: photo.blur_hash,
      description: photo.description,
      altDescription: photo.alt_description,
      likes: photo.likes,
      createdAt: photo.created_at,
    })),
  };
}

/**
 * Fetches full photo detail from Unsplash including location data.
 * This requires a separate API call to /photos/:id.
 */
export async function fetchUnsplashPhotoDetail(photoId: string): Promise<{
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
} | null> {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const url = `https://api.unsplash.com/photos/${photoId}`;
  const response = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });

  if (!response.ok) return null;

  const photo = (await response.json()) as UnsplashPhotoDetail;
  if (!photo.location) return null;

  return {
    city: photo.location.city,
    country: photo.location.country,
    lat: photo.location.position?.latitude ?? null,
    lng: photo.location.position?.longitude ?? null,
  };
}

/**
 * Fetches full photo data from Unsplash /photos/:id including all metadata and location.
 * Used for re-fetching metadata of existing images.
 */
export async function fetchFullUnsplashPhoto(photoId: string): Promise<{
  urlSmall: string;
  urlRegular: string;
  width: number;
  height: number;
  color: string | null;
  blurHash: string | null;
  description: string | null;
  altDescription: string | null;
  likes: number;
  photographerName: string;
  photographerUrl: string;
  downloadLocation: string;
  createdAtUnsplash: string;
  locationCity: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLng: number | null;
} | null> {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const url = `https://api.unsplash.com/photos/${photoId}`;
  const response = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });

  if (!response.ok) return null;

  const photo = (await response.json()) as UnsplashPhotoDetail;

  return {
    urlSmall: photo.urls.small,
    urlRegular: photo.urls.regular,
    width: photo.width,
    height: photo.height,
    color: photo.color,
    blurHash: photo.blur_hash,
    description: photo.description,
    altDescription: photo.alt_description,
    likes: photo.likes,
    photographerName: photo.user.name,
    photographerUrl: photo.user.links.html,
    downloadLocation: photo.links.download_location,
    createdAtUnsplash: photo.created_at,
    locationCity: photo.location?.city ?? null,
    locationCountry: photo.location?.country ?? null,
    locationLat: photo.location?.position?.latitude ?? null,
    locationLng: photo.location?.position?.longitude ?? null,
  };
}

/**
 * Lists photos by a specific Unsplash user. Returns up to `perPage` results
 * for the given page. Used for backfilling category images.
 */
export async function listUnsplashUserPhotos(
  username: string,
  page = 1,
  perPage = 30,
): Promise<UnsplashPhoto[]> {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const url = `https://api.unsplash.com/users/${username}/photos?${params.toString()}`;
  const response = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });

  if (!response.ok) return [];

  return (await response.json()) as UnsplashPhoto[];
}

/**
 * Calls Unsplash download-tracking endpoint.
 */
export async function triggerUnsplashDownload(downloadLocation: string): Promise<boolean> {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) return false;

  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
  return true;
}
