import { extractHomepage, fetchPreviewImage } from "../lib/og.js";

export async function fetchShopPreviewImage(url: string) {
  return fetchPreviewImage(url);
}

export async function fetchShopPreviewImageFromHomepage(url: string) {
  return fetchPreviewImage(extractHomepage(url));
}

export function hydrateShopOgImageInBackground(
  shopUrl: string,
  onImageResolved: (imageUrl: string) => Promise<void> | void,
): void {
  fetchPreviewImage(shopUrl)
    .then(async (result) => {
      if (result) {
        await onImageResolved(result.url);
      }
    })
    .catch(() => {});
}
