import type { MediaAsset } from "@lmaa/shared";

import type { DashboardLocale } from "@/i18n/messages.ts";

export function isImageAsset(asset: MediaAsset) {
  return asset.kind === "image";
}

export function formatBytes(bytes: number, locale: DashboardLocale) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

export function formatMediaDate(value: string, locale: DashboardLocale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getMediaTypeLabel(asset: MediaAsset) {
  const slashIndex = asset.mimeType.indexOf("/");
  return slashIndex >= 0 ? asset.mimeType.slice(slashIndex + 1).toUpperCase() : asset.mimeType;
}
