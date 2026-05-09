import type { IconType } from "react-icons";
import {
  FaAndroid,
  FaApple,
  FaChrome,
  FaDesktop,
  FaEdge,
  FaFirefoxBrowser,
  FaGlobe,
  FaLaptop,
  FaLinux,
  FaMobileScreenButton,
  FaOpera,
  FaSafari,
  FaTabletScreenButton,
  FaWindows,
} from "react-icons/fa6";

import type { UmamiMetricType, UmamiPeriod } from "@/features/analytics/hooks/useUmamiStats.ts";
import type { DashboardLocale } from "@/i18n/messages.ts";

export const PERIOD_VALUES: UmamiPeriod[] = ["today", "7d", "30d", "60d", "90d"];
export const COLLAPSIBLE_ROW_LIMIT = 10;
export const COLLAPSIBLE_ANIMATION_MS = 280;

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  deutschland: "DE",
  germany: "DE",
  osterreich: "AT",
  austria: "AT",
  schweiz: "CH",
  switzerland: "CH",
  tschechien: "CZ",
  czechia: "CZ",
  "czech republic": "CZ",
  niederlande: "NL",
  netherlands: "NL",
  frankreich: "FR",
  france: "FR",
  schweden: "SE",
  sweden: "SE",
  danemark: "DK",
  denmark: "DK",
  "vereinigtes konigreich": "GB",
  "united kingdom": "GB",
  "vereinigte staaten": "US",
  "united states": "US",
  usa: "US",
};

const DE_REGION_CODE_TO_NAME: Record<DashboardLocale, Record<string, string>> = {
  de: {
    BB: "Brandenburg",
    BE: "Berlin",
    BW: "Baden-Württemberg",
    BY: "Bayern",
    HB: "Bremen",
    HE: "Hessen",
    HH: "Hamburg",
    MV: "Mecklenburg-Vorpommern",
    NI: "Niedersachsen",
    NW: "Nordrhein-Westfalen",
    RP: "Rheinland-Pfalz",
    SH: "Schleswig-Holstein",
    SL: "Saarland",
    SN: "Sachsen",
    ST: "Sachsen-Anhalt",
    TH: "Thüringen",
  },
  en: {
    BB: "Brandenburg",
    BE: "Berlin",
    BW: "Baden-Württemberg",
    BY: "Bavaria",
    HB: "Bremen",
    HE: "Hesse",
    HH: "Hamburg",
    MV: "Mecklenburg-Western Pomerania",
    NI: "Lower Saxony",
    NW: "North Rhine-Westphalia",
    RP: "Rhineland-Palatinate",
    SH: "Schleswig-Holstein",
    SL: "Saarland",
    SN: "Saxony",
    ST: "Saxony-Anhalt",
    TH: "Thuringia",
  },
};

const regionNameCache = new Map<DashboardLocale, Intl.DisplayNames | null>();

function normalizeName(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function toMetricText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function isUnknownValue(value: string): boolean {
  const normalized = normalizeName(value).replace(/[()]/g, "");
  return normalized === "unknown" || normalized === "unbekannt" || normalized === "null";
}

function getCountryCodeFromName(value: string): string | null {
  const normalized = normalizeName(value);
  if (/^[a-z]{2}$/.test(normalized)) return normalized.toUpperCase();
  return COUNTRY_NAME_TO_CODE[normalized] ?? null;
}

function getRegionNames(locale: DashboardLocale): Intl.DisplayNames | null {
  if (regionNameCache.has(locale)) {
    return regionNameCache.get(locale) ?? null;
  }

  let resolved: Intl.DisplayNames | null = null;
  try {
    resolved = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    resolved = null;
  }
  regionNameCache.set(locale, resolved);
  return resolved;
}

function getCountryDisplayName(
  value: string,
  locale: DashboardLocale,
  unknownLabel: string,
): string {
  const code = getCountryCodeFromName(value);
  if (code) {
    return getRegionNames(locale)?.of(code) ?? code;
  }
  return isUnknownValue(value) ? unknownLabel : value.trim();
}

export function parseLocationDisplay(
  type: UmamiMetricType,
  value: string,
  locale: DashboardLocale,
  unknownLabel: string,
): { label: string; flag: string | null } {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const regionPart = parts[0] ?? value.trim();
  const countryPart = parts[parts.length - 1] ?? "";
  const firstLabel = isUnknownValue(regionPart) ? unknownLabel : regionPart;
  const code = getCountryCodeFromName(countryPart);
  const flag = code ? countryFlag(code) : null;
  const countryLabel = getCountryDisplayName(countryPart, locale, unknownLabel);

  if (type === "country") {
    return { label: countryLabel, flag };
  }

  if (type === "city") {
    if (isUnknownValue(regionPart)) {
      return { label: countryLabel, flag };
    }
    if (parts.length >= 2) {
      return { label: `${regionPart}, ${countryLabel}`, flag };
    }
    return { label: regionPart || unknownLabel, flag };
  }

  const regionCodeMatch = /^([A-Za-z]{2})-([A-Za-z0-9]{2,3})$/.exec(regionPart);
  if (regionCodeMatch) {
    const countryCode = regionCodeMatch[1].toUpperCase();
    const subCode = regionCodeMatch[2].toUpperCase();
    const countryLabel = getCountryDisplayName(countryCode, locale, unknownLabel);
    const regionName =
      countryCode === "DE"
        ? (DE_REGION_CODE_TO_NAME[locale][subCode] ?? `${countryCode}-${subCode}`)
        : regionPart;
    return { label: `${regionName}, ${countryLabel}`, flag: countryFlag(countryCode) };
  }

  if (parts.length >= 2) {
    return { label: `${firstLabel}, ${countryLabel}`, flag };
  }

  return { label: countryLabel || unknownLabel, flag };
}

function normalizeMetricValue(value: string): string {
  return value.trim().toLowerCase();
}

function getBrowserIcon(value: string): IconType {
  const key = normalizeMetricValue(value);
  if (key.includes("firefox") || key.includes("fxios")) return FaFirefoxBrowser;
  if (key.includes("chrome") || key.includes("crios") || key.includes("chromium")) return FaChrome;
  if (key.includes("safari") || key === "ios") return FaSafari;
  if (key.includes("edge")) return FaEdge;
  if (key.includes("opera")) return FaOpera;
  return FaGlobe;
}

function getOsIcon(value: string): IconType {
  const key = normalizeMetricValue(value);
  if (key.includes("android")) return FaAndroid;
  if (key.includes("ios") || key.includes("mac")) return FaApple;
  if (key.includes("windows")) return FaWindows;
  if (key.includes("linux")) return FaLinux;
  return FaDesktop;
}

function getDeviceIcon(value: string): IconType {
  const key = normalizeMetricValue(value);
  if (key.includes("mobile") || key.includes("phone")) return FaMobileScreenButton;
  if (key.includes("tablet")) return FaTabletScreenButton;
  if (key.includes("laptop") || key.includes("notebook")) return FaLaptop;
  if (key.includes("desktop")) return FaDesktop;
  return FaDesktop;
}

export function getEnvironmentIcon(type: UmamiMetricType, value: string): IconType | null {
  if (type === "browser") return getBrowserIcon(value);
  if (type === "os") return getOsIcon(value);
  if (type === "device") return getDeviceIcon(value);
  return null;
}

export function loadPeriod(storageKey: string): UmamiPeriod {
  const saved = localStorage.getItem(storageKey);
  if (saved && PERIOD_VALUES.some((p) => p === saved)) return saved as UmamiPeriod;
  return "7d";
}

export function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(
    countryCode.toUpperCase().charCodeAt(0) + offset,
    countryCode.toUpperCase().charCodeAt(1) + offset,
  );
}

export function formatDuration(
  seconds: number,
  units: { secondsShort: string; minutesShort: string },
): string {
  if (seconds < 60) return `${seconds}${units.secondsShort}`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}${units.minutesShort} ${remainingSeconds}${units.secondsShort}`;
}

export function formatLabel(x: string, period: UmamiPeriod, locale: DashboardLocale): string {
  const date = new Date(x);
  if (period === "today") {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  }
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(date);
}

export function formatTrendValue(change: number): string {
  const abs = Math.abs(change);
  if (abs >= 100) return `${Math.round(abs)}%`;
  if (abs >= 10) return `${abs.toFixed(1)}%`;
  return `${abs.toFixed(2)}%`;
}

export function previousValueFromChange(
  current: number,
  change: number | null | undefined,
): number | null {
  if (!Number.isFinite(current) || typeof change !== "number" || !Number.isFinite(change))
    return null;
  const factor = 1 + change / 100;
  if (factor === 0) return null;
  return current / factor;
}

export function relativeChange(current: number, previous: number | null): number | null {
  if (
    !Number.isFinite(current) ||
    previous === null ||
    !Number.isFinite(previous) ||
    previous === 0
  )
    return null;
  return ((current - previous) / previous) * 100;
}

export function formatMinute(ts: number, locale: DashboardLocale): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ts));
}

export function intTicks(max: number): number[] {
  if (max <= 0) return [0];
  if (max <= 10) return Array.from({ length: max + 1 }, (_, i) => i);
  const step = max <= 50 ? 5 : max <= 200 ? 20 : Math.ceil(max / 10) * 2;
  const ticks: number[] = [];
  for (let i = 0; i <= max; i += step) ticks.push(i);
  if (ticks[ticks.length - 1] < max) ticks.push(max);
  return ticks;
}

export interface MetricTabConfig {
  label: string;
  value: UmamiMetricType;
  columnLabel: string;
  renderLabel?: (x: string) => string;
}
