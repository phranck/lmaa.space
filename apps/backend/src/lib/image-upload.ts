import sharp from "sharp";

import { detectImageType } from "./validate.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageUploadFailure = { ok: false; reason: "missing_file" | "too_large" | "invalid_image" };
type ImageUploadSuccess = { ok: true; dataUrl: string };

/**
 * Validates and processes an uploaded image file into a resized WebP data URL.
 *
 * @param file - Raw multipart file payload (typed as `unknown` at the HTTP boundary).
 * @param width - Target width in pixels.
 * @param height - Target height in pixels.
 * @returns A result union with a `dataUrl` on success or a `reason` on failure.
 */
export async function processImageUpload(
  file: unknown,
  width: number,
  height: number,
): Promise<ImageUploadFailure | ImageUploadSuccess> {
  if (!(file instanceof File)) {
    return { ok: false, reason: "missing_file" };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageType(buffer);
  if (!detectedType) {
    return { ok: false, reason: "invalid_image" };
  }

  const resized = await sharp(buffer).resize(width, height, { fit: "cover" }).webp().toBuffer();
  const dataUrl = `data:image/webp;base64,${resized.toString("base64")}`;

  return { ok: true, dataUrl };
}
