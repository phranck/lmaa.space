import { searchUnsplashPhotos, triggerUnsplashDownload } from "./unsplash.js";

export async function searchManagedUnsplashPhotos(query: string, page: string) {
  return searchUnsplashPhotos(query, page);
}

export async function triggerManagedUnsplashDownload(downloadLocation: string) {
  const ok = await triggerUnsplashDownload(downloadLocation);
  return { ok };
}
