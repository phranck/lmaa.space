import crypto from "node:crypto";
import path from "node:path";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { detectImageType } from "./validate.js";
import { env } from "../config/env.js";

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_BY_TYPE = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

const IMAGE_EXT_BY_TYPE = {
  avif: ".avif",
  gif: ".gif",
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
} as const;

const DOCUMENT_MIME_BY_EXTENSION = {
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

type MediaKind = "image" | "document";

type StoreMediaFailure = {
  ok: false;
  reason: "missing_file" | "too_large" | "invalid_file";
};

type StoreMediaSuccess = {
  ok: true;
  created: {
    displayName: string;
    originalName: string;
    storedFilename: string;
    mimeType: string;
    kind: MediaKind;
    sizeBytes: number;
    width: number | null;
    height: number | null;
  };
};

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: true,
});

function sanitizeDisplayName(raw: string): string {
  const cleaned = raw
    .replace(/[/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  return cleaned || "file";
}

function slugifyBase(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function inferDocumentExtension(fileName: string): keyof typeof DOCUMENT_MIME_BY_EXTENSION | null {
  const ext = path.extname(fileName).toLowerCase() as keyof typeof DOCUMENT_MIME_BY_EXTENSION;
  return ext in DOCUMENT_MIME_BY_EXTENSION ? ext : null;
}

/**
 * Returns the public URL for a stored media file.
 */
export function getMediaPublicUrl(storedFilename: string): string {
  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${storedFilename}`;
}

/**
 * Uploads a media file to S3-compatible object storage.
 */
export async function storeUploadedMedia(file: unknown): Promise<StoreMediaFailure | StoreMediaSuccess> {
  if (!(file instanceof File)) {
    return { ok: false, reason: "missing_file" };
  }

  if (file.size > MAX_MEDIA_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalName = sanitizeDisplayName(file.name || "file");
  const imageType = detectImageType(buffer);

  let kind: MediaKind;
  let mimeType: string;
  let extension: string;
  let width: number | null = null;
  let height: number | null = null;

  if (imageType) {
    kind = "image";
    mimeType = IMAGE_MIME_BY_TYPE[imageType];
    extension = IMAGE_EXT_BY_TYPE[imageType];

    try {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;
    } catch {
      width = null;
      height = null;
    }
  } else {
    const documentExtension = inferDocumentExtension(originalName);
    if (!documentExtension) {
      return { ok: false, reason: "invalid_file" };
    }

    if (documentExtension === ".pdf" && buffer.subarray(0, 5).toString("utf8") !== "%PDF-") {
      return { ok: false, reason: "invalid_file" };
    }

    kind = "document";
    mimeType = DOCUMENT_MIME_BY_EXTENSION[documentExtension];
    extension = documentExtension;
  }

  const baseName = slugifyBase(path.basename(originalName, path.extname(originalName))) || "file";
  const storedFilename = `${crypto.randomUUID()}-${baseName}${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storedFilename,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return {
    ok: true,
    created: {
      displayName: originalName,
      originalName,
      storedFilename,
      mimeType,
      kind,
      sizeBytes: buffer.byteLength,
      width,
      height,
    },
  };
}

/**
 * Deletes a stored media file from S3-compatible object storage.
 */
export async function removeStoredMedia(storedFilename: string) {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storedFilename,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") {
      return;
    }
    throw error;
  }
}
