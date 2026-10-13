/** The host Unsplash serves its photos from, whose URLs take imgix parameters. */
const UNSPLASH_PHOTO_HOST = "images.unsplash.com";

/**
 * A photo's URL in the format a browser draws in one step.
 *
 * The photos the site stores are Unsplash's `regular` URLs, which ask for a
 * JPEG, and Unsplash serves those progressive. A browser paints a progressive
 * JPEG from its first coarse scan on and sharpens it as the rest arrives, so
 * the photo shows blurred first and reads as a different picture being
 * replaced. Chromium and WebKit draw an AVIF only once it is complete, and
 * Unsplash serves one from the same URL with `fm=avif`, which is smaller too.
 *
 * A width asks Unsplash for the photo at that many pixels across, for a place
 * that shows it smaller than the stored 1080: a category card needs 640.
 *
 * Any other URL is returned as it is: a photo from another host would not
 * understand the parameters, and a path on this site is not a URL that can be
 * parsed on its own.
 *
 * @param url - The photo's URL as stored.
 * @param width - The width in pixels to ask for; the stored one when omitted.
 * @returns The same photo asked for as AVIF where Unsplash serves it, or `url`.
 */
export function unsplashAvif(url: string, width?: number): string {
  let photo: URL;
  try {
    photo = new URL(url);
  } catch {
    return url;
  }
  if (photo.hostname !== UNSPLASH_PHOTO_HOST) return url;
  photo.searchParams.set("fm", "avif");
  if (width !== undefined) photo.searchParams.set("w", String(width));
  return photo.href;
}
