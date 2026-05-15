import { logger } from "../lib/logger.js";
import { extractHomepage, fetchPreviewImage } from "../lib/og.js";

/**
 * Fetches a preview image for the homepage of a URL.
 *
 * @param url - Arbitrary URL used to derive homepage origin.
 * @returns Preview image descriptor or `null`.
 */
export async function fetchShopPreviewImageFromHomepage(url: string) {
  return fetchPreviewImage(extractHomepage(url));
}

/**
 * Resolves OG image in background and invokes callback on success.
 *
 * @param shopUrl - URL to inspect.
 * @param onImageResolved - Callback invoked with resolved image URL.
 * @returns `void` (fire-and-forget operation).
 *
 * @remarks
 * Any internal network/parsing errors are swallowed intentionally to keep
 * calling flows non-blocking.
 */
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
    .catch((err) => {
      logger.error({ err, shopUrl }, "background OG image hydration failed");
    });
}
