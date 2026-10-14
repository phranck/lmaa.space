import type { MediaAsset } from "@lmaa/shared";

/**
 * Image types an email template may use as its header or footer banner.
 *
 * The media library also holds WebP and AVIF, which Outlook for Windows does
 * not display (https://www.caniemail.com/features/image-webp/,
 * https://www.caniemail.com/features/image-avif/). A banner in either format
 * would be missing for those readers, so the picker leaves them out.
 */
const EMAIL_BANNER_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
]);

/**
 * Decides whether a media asset can serve as an email banner.
 *
 * @param asset - Asset from the media library. Its `mimeType` is the type the
 *   backend detected from the file's content on upload.
 * @returns `true` for JPEG, PNG and GIF images, `false` for every other image
 *   type and for non-image assets.
 */
export function isEmailBannerImage(asset: MediaAsset): boolean {
  return asset.kind === "image" && EMAIL_BANNER_MIME_TYPES.has(asset.mimeType);
}
