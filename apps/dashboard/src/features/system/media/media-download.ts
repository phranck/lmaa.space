import type { MediaAsset } from "@lmaa/shared";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
  "model/stl": "stl",
  "model/obj": "obj",
};

/**
 * Return the canonical file extension (without dot) for the given MIME type,
 * or an empty string if the type is not in the whitelist.
 */
function extensionForMimeType(mimeType: string): string {
  return MIME_EXTENSION_MAP[mimeType.toLowerCase()] ?? "";
}

/**
 * Build the suggested download filename for an asset:
 * - If `alias` is set, use `alias.ext` where `ext` comes from the MIME type.
 *   Falls back to the alias alone when the MIME type is unknown.
 * - Otherwise return `originalName` unchanged.
 */
export function downloadFilenameForAsset(asset: MediaAsset): string {
  if (asset.alias) {
    const ext = extensionForMimeType(asset.mimeType);
    return ext ? `${asset.alias}.${ext}` : asset.alias;
  }
  return asset.originalName;
}
