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

export async function searchUnsplashPhotos(
  query: string,
  page = "1",
): Promise<UnsplashSearchResult> {
  if (!query) return { results: [], total: 0 };

  const key = getUnsplashApiKey();
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&page=${page}`;
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

export async function triggerUnsplashDownload(downloadLocation: string): Promise<boolean> {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) return false;

  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
  return true;
}
