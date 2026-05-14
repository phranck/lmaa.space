import type { MediaAsset } from "@lmaa/shared";
import { HLS_MANIFEST_MIME_TYPE } from "@lmaa/shared";

import type { DashboardLocale } from "@/i18n/messages.ts";

export function isImageAsset(asset: MediaAsset) {
  return asset.kind === "image";
}

export function isHlsBundleAsset(asset: MediaAsset) {
  return asset.mimeType === HLS_MANIFEST_MIME_TYPE || asset.storedFilename.endsWith(".m3u8");
}

export function isVideoAsset(asset: MediaAsset) {
  if (isHlsBundleAsset(asset)) return false;
  return asset.kind === "video" || asset.mimeType.startsWith("video/");
}

function sanitizeShortcodeAttribute(value: string) {
  return value.trim().replace(/[\r\n\t]+/g, " ").replaceAll('"', "'");
}

export function getHlsMarkdownEmbed(asset: MediaAsset) {
  const target = asset.alias?.trim() || asset.url;
  const title = sanitizeShortcodeAttribute(asset.displayName);
  return title ? `[[hls:${target} title="${title}"]]` : `[[hls:${target}]]`;
}

export function formatBytes(bytes: number, locale: DashboardLocale) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

export function formatMediaDate(value: string, locale: DashboardLocale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getMediaTypeLabel(asset: MediaAsset) {
  if (isHlsBundleAsset(asset)) return "HLS";

  const slashIndex = asset.mimeType.indexOf("/");
  return slashIndex >= 0 ? asset.mimeType.slice(slashIndex + 1).toUpperCase() : asset.mimeType;
}
