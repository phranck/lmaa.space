import crypto from "node:crypto";
import path from "node:path";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

import {
  HLS_MANIFEST_MIME_TYPE,
  HLS_SEGMENT_MIME_TYPE,
  MEDIA_UPLOAD_MAX_BYTES,
  type MediaKind,
} from "@lmaa/shared";

import { detectImageType } from "./validate.js";
import { env } from "../config/env.js";

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

const VIDEO_MIME_BY_EXTENSION = {
  ".mp4": "video/mp4",
} as const;

const HLS_MIME_BY_EXTENSION = {
  ".m3u8": HLS_MANIFEST_MIME_TYPE,
  ".ts": HLS_SEGMENT_MIME_TYPE,
} as const;

type StoreMediaFailure = {
  ok: false;
  reason: "missing_file" | "too_large" | "invalid_file" | "invalid_bundle";
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

export interface StoreHlsBundleFile {
  file: unknown;
  relativePath: string;
}

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
  const cleaned = raw.replace(/[/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);

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

function inferVideoExtension(fileName: string): keyof typeof VIDEO_MIME_BY_EXTENSION | null {
  const ext = path.extname(fileName).toLowerCase() as keyof typeof VIDEO_MIME_BY_EXTENSION;
  return ext in VIDEO_MIME_BY_EXTENSION ? ext : null;
}

function inferHlsExtension(filePath: string): keyof typeof HLS_MIME_BY_EXTENSION | null {
  const ext = path.posix.extname(filePath).toLowerCase() as keyof typeof HLS_MIME_BY_EXTENSION;
  return ext in HLS_MIME_BY_EXTENSION ? ext : null;
}

function isMp4File(buffer: Buffer): boolean {
  return buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
}

function normalizeBundlePath(rawPath: string): string | null {
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 0) return null;
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  if (segments.some((segment) => /[\u0000-\u001f\u007f]/.test(segment))) return null;

  return segments.join("/");
}

function stripUriSuffix(uri: string): string {
  return uri.split(/[?#]/, 1)[0] ?? uri;
}

function isExternalUri(uri: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(uri) || uri.startsWith("/");
}

function resolveManifestReference(manifestPath: string, rawUri: string): string | null {
  const uri = stripUriSuffix(rawUri.trim());
  if (!uri || isExternalUri(uri)) return null;

  const manifestDir = path.posix.dirname(manifestPath);
  const resolved = path.posix.normalize(
    manifestDir === "." ? uri : path.posix.join(manifestDir, uri),
  );
  if (resolved === "." || resolved.startsWith("../") || resolved === "..") return null;
  return resolved;
}

function hlsBundlePrefixFromManifest(storedFilename: string): string | null {
  const slashIndex = storedFilename.lastIndexOf("/");
  if (slashIndex < 0) return null;
  return storedFilename.slice(0, slashIndex + 1);
}

export function isHlsManifestKey(storedFilename: string): boolean {
  return storedFilename.toLowerCase().endsWith(".m3u8");
}

/**
 * Returns the public URL for a stored media file.
 */
export function getMediaPublicUrl(storedFilename: string): string {
  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${storedFilename}`;
}

/** User-facing metadata stored as S3 object user-metadata headers. */
export interface S3MediaMeta {
  displayName: string;
  originalName: string;
  alias: string | null;
  kind: MediaKind;
  width: number | null;
  height: number | null;
}

function buildS3Metadata(meta: S3MediaMeta): Record<string, string> {
  const m: Record<string, string> = {
    "display-name": meta.displayName,
    "original-name": meta.originalName,
    kind: meta.kind,
  };
  if (meta.alias) m.alias = meta.alias;
  if (meta.width != null) m.width = String(meta.width);
  if (meta.height != null) m.height = String(meta.height);
  return m;
}

function parseS3Metadata(raw: Record<string, string> | undefined): Partial<S3MediaMeta> {
  if (!raw) return {};
  return {
    displayName: raw["display-name"] || undefined,
    originalName: raw["original-name"] || undefined,
    alias: raw.alias || null,
    kind: (raw.kind as MediaKind) || undefined,
    width: raw.width ? Number(raw.width) : null,
    height: raw.height ? Number(raw.height) : null,
  };
}

/**
 * Uploads a media file to S3-compatible object storage.
 */
export async function storeUploadedMedia(
  file: unknown,
): Promise<StoreMediaFailure | StoreMediaSuccess> {
  if (!(file instanceof File)) {
    return { ok: false, reason: "missing_file" };
  }

  if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
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
    const videoExtension = inferVideoExtension(originalName);
    if (videoExtension) {
      if (!isMp4File(buffer)) {
        return { ok: false, reason: "invalid_file" };
      }

      kind = "video";
      mimeType = VIDEO_MIME_BY_EXTENSION[videoExtension];
      extension = videoExtension;
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
  }

  const baseName = slugifyBase(path.basename(originalName, path.extname(originalName))) || "file";
  const storedFilename = `${crypto.randomUUID()}-${baseName}${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storedFilename,
      Body: buffer,
      ContentType: mimeType,
      Metadata: buildS3Metadata({
        displayName: originalName,
        originalName,
        alias: null,
        kind,
        width,
        height,
      }),
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
 * Uploads a self-contained HLS bundle to S3-compatible object storage.
 */
export async function storeUploadedHlsBundle(input: {
  displayName: string;
  files: StoreHlsBundleFile[];
}): Promise<StoreMediaFailure | StoreMediaSuccess> {
  if (input.files.length === 0) {
    return { ok: false, reason: "missing_file" };
  }

  const seenPaths = new Set<string>();
  const prepared: Array<{
    file: File;
    relativePath: string;
    extension: keyof typeof HLS_MIME_BY_EXTENSION;
  }> = [];
  let totalSize = 0;

  for (const item of input.files) {
    if (!(item.file instanceof File)) {
      return { ok: false, reason: "missing_file" };
    }

    const relativePath = normalizeBundlePath(item.relativePath || item.file.name);
    if (!relativePath || seenPaths.has(relativePath)) {
      return { ok: false, reason: "invalid_bundle" };
    }

    const extension = inferHlsExtension(relativePath);
    if (!extension) {
      return { ok: false, reason: "invalid_bundle" };
    }

    totalSize += item.file.size;
    if (totalSize > MEDIA_UPLOAD_MAX_BYTES) {
      return { ok: false, reason: "too_large" };
    }

    seenPaths.add(relativePath);
    prepared.push({ file: item.file, relativePath, extension });
  }

  const manifests = prepared.filter((item) => item.extension === ".m3u8");
  const segmentCount = prepared.filter((item) => item.extension === ".ts").length;
  if (manifests.length !== 1 || segmentCount === 0) {
    return { ok: false, reason: "invalid_bundle" };
  }

  const manifest = manifests[0];
  const manifestBuffer = Buffer.from(await manifest.file.arrayBuffer());
  const manifestText = manifestBuffer.toString("utf8");
  if (!manifestText.trimStart().startsWith("#EXTM3U")) {
    return { ok: false, reason: "invalid_bundle" };
  }

  const manifestReferences = manifestText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => resolveManifestReference(manifest.relativePath, line));

  if (
    manifestReferences.length === 0 ||
    manifestReferences.some((reference) => reference == null || !seenPaths.has(reference))
  ) {
    return { ok: false, reason: "invalid_bundle" };
  }

  const displayName = sanitizeDisplayName(input.displayName);
  const prefix = `${crypto.randomUUID()}-${slugifyBase(displayName) || "hls-bundle"}/`;
  const storedFilename = `${prefix}${manifest.relativePath}`;

  try {
    for (const item of prepared) {
      const buffer =
        item === manifest ? manifestBuffer : Buffer.from(await item.file.arrayBuffer());

      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: `${prefix}${item.relativePath}`,
          Body: buffer,
          ContentType: HLS_MIME_BY_EXTENSION[item.extension],
          Metadata: buildS3Metadata({
            displayName,
            originalName: displayName,
            alias: null,
            kind: "video",
            width: null,
            height: null,
          }),
        }),
      );
    }
  } catch (error) {
    await removeStoredMediaPrefix(prefix);
    throw error;
  }

  return {
    ok: true,
    created: {
      displayName,
      originalName: displayName,
      storedFilename,
      mimeType: HLS_MANIFEST_MIME_TYPE,
      kind: "video",
      sizeBytes: totalSize,
      width: null,
      height: null,
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

/**
 * Deletes all stored media objects below a prefix from S3-compatible object storage.
 */
export async function removeStoredMediaPrefix(prefix: string) {
  if (!prefix) return;

  let continuationToken: string | undefined;
  do {
    const listResp = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = (listResp.Contents ?? [])
      .map((obj) => obj.Key)
      .filter((key): key is string => Boolean(key));

    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: env.S3_BUCKET,
          Delete: {
            Objects: objects.map((Key) => ({ Key })),
          },
        }),
      );
    }

    continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : undefined;
  } while (continuationToken);
}

/**
 * Deletes a stored media file or a full HLS bundle prefix.
 */
export async function removeStoredMediaAsset(storedFilename: string) {
  if (isHlsManifestKey(storedFilename)) {
    const prefix = hlsBundlePrefixFromManifest(storedFilename);
    if (prefix) {
      await removeStoredMediaPrefix(prefix);
      return;
    }
  }

  await removeStoredMedia(storedFilename);
}

/**
 * Updates S3 user-metadata on an existing object (requires copy-in-place).
 */
export async function updateStoredMediaMeta(storedFilename: string, meta: S3MediaMeta) {
  const headResp = await s3.send(
    new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: storedFilename }),
  );

  await s3.send(
    new CopyObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storedFilename,
      CopySource: `${env.S3_BUCKET}/${storedFilename}`,
      ContentType: headResp.ContentType,
      Metadata: buildS3Metadata(meta),
      MetadataDirective: "REPLACE",
    }),
  );
}

/** A single S3 object entry as returned by `listAllStoredMedia`. */
export interface S3ObjectEntry {
  key: string;
  size: number;
  contentType: string;
  metadata: Partial<S3MediaMeta>;
}

/**
 * Lists all objects in the bucket with their user-metadata.
 */
export async function listAllStoredMedia(): Promise<S3ObjectEntry[]> {
  const entries: S3ObjectEntry[] = [];
  let continuationToken: string | undefined;

  do {
    const listResp = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of listResp.Contents ?? []) {
      if (!obj.Key || !obj.Size) continue;

      const head = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: obj.Key }));

      entries.push({
        key: obj.Key,
        size: obj.Size,
        contentType: head.ContentType ?? "application/octet-stream",
        metadata: parseS3Metadata(head.Metadata),
      });
    }

    continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : undefined;
  } while (continuationToken);

  return entries;
}
