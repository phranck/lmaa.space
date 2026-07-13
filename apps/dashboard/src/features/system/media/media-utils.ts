import type { MediaAsset } from "@lmaa/shared";
import { HLS_MANIFEST_MIME_TYPE } from "@lmaa/shared";

import type { DashboardLocale } from "@/i18n/messages.ts";

const BYTE_FORMATTERS: Record<DashboardLocale, Record<"compact" | "fixed", Intl.NumberFormat>> = {
  de: {
    compact: new Intl.NumberFormat("de", { maximumFractionDigits: 1 }),
    fixed: new Intl.NumberFormat("de", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  },
  en: {
    compact: new Intl.NumberFormat("en", { maximumFractionDigits: 1 }),
    fixed: new Intl.NumberFormat("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  },
};
const MEDIA_DATE_FORMATTERS: Record<DashboardLocale, Intl.DateTimeFormat> = {
  de: new Intl.DateTimeFormat("de", { dateStyle: "medium", timeStyle: "short" }),
  en: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }),
};

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

export function stripFileExtension(value: string) {
  return value.replace(/\.[^.]+$/, "");
}

export function canOpenInBrowser(asset: MediaAsset) {
  return (
    isImageAsset(asset) ||
    isVideoAsset(asset) ||
    isHlsBundleAsset(asset) ||
    asset.mimeType === "application/pdf"
  );
}

function sanitizeShortcodeAttribute(value: string) {
  return value
    .trim()
    .replace(/[\r\n\t]+/g, " ")
    .replaceAll('"', "'");
}

export function getHlsMarkdownEmbed(asset: MediaAsset) {
  const target = asset.alias?.trim() || asset.url;
  const title = sanitizeShortcodeAttribute(asset.displayName);
  const poster = asset.posterUrl ? ` poster="${sanitizeShortcodeAttribute(asset.posterUrl)}"` : "";
  return title ? `[[hls:${target} title="${title}"${poster}]]` : `[[hls:${target}${poster}]]`;
}

interface FormatBytesOptions {
  fixedFractionDigits?: number;
}

export function formatBytes(
  bytes: number,
  locale: DashboardLocale,
  options: FormatBytesOptions = {},
) {
  const formatter =
    BYTE_FORMATTERS[locale][options.fixedFractionDigits === undefined ? "compact" : "fixed"];

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatter.format(bytes / 1024)} KB`;
  return `${formatter.format(bytes / (1024 * 1024))} MB`;
}

export function formatMediaDate(value: string, locale: DashboardLocale) {
  return MEDIA_DATE_FORMATTERS[locale].format(new Date(value));
}

export function getMediaTypeLabel(asset: MediaAsset) {
  if (isHlsBundleAsset(asset)) return "HLS";

  const slashIndex = asset.mimeType.indexOf("/");
  return slashIndex >= 0 ? asset.mimeType.slice(slashIndex + 1).toUpperCase() : asset.mimeType;
}
