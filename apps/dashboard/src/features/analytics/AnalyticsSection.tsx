import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useTheme } from "@/context/ThemeContext.tsx";
import {
  type UmamiMetricType,
  type UmamiPeriod,
  useUmamiActive,
  useUmamiMetrics,
  useUmamiPageviews,
  useUmamiRealtime,
  useUmamiStats,
} from "@/features/analytics/hooks/useUmamiStats.ts";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import type { DashboardLocale } from "@/i18n/messages.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";
import { type ReactNode, Suspense, lazy, useCallback, useMemo, useState } from "react";
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

const RealtimeBarsChart = lazy(() =>
  import("./AnalyticsCharts.tsx").then((module) => ({ default: module.RealtimeBarsChart })),
);
const TrafficAreaChart = lazy(() =>
  import("./AnalyticsCharts.tsx").then((module) => ({ default: module.TrafficAreaChart })),
);

const PERIOD_VALUES: UmamiPeriod[] = ["today", "7d", "30d", "60d", "90d"];

interface MetricTabConfig {
  label: string;
  value: UmamiMetricType;
  columnLabel: string;
  renderLabel?: (x: string) => string;
}

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

function toMetricText(value: unknown): string {
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

function parseLocationDisplay(
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

function getEnvironmentIcon(type: UmamiMetricType, value: string): IconType | null {
  if (type === "browser") return getBrowserIcon(value);
  if (type === "os") return getOsIcon(value);
  if (type === "device") return getDeviceIcon(value);
  return null;
}

function loadPeriod(storageKey: string): UmamiPeriod {
  const saved = localStorage.getItem(storageKey);
  if (saved && PERIOD_VALUES.some((p) => p === saved)) return saved as UmamiPeriod;
  return "7d";
}

function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(
    countryCode.toUpperCase().charCodeAt(0) + offset,
    countryCode.toUpperCase().charCodeAt(1) + offset,
  );
}

function formatDuration(
  seconds: number,
  units: { secondsShort: string; minutesShort: string },
): string {
  if (seconds < 60) return `${seconds}${units.secondsShort}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}${units.minutesShort} ${s}${units.secondsShort}`;
}

function formatLabel(x: string, period: UmamiPeriod, locale: DashboardLocale): string {
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

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: number | null;
  invertTrendColor?: boolean;
  sub?: string;
}

function formatTrendValue(change: number): string {
  const abs = Math.abs(change);
  if (abs >= 100) return `${Math.round(abs)}%`;
  if (abs >= 10) return `${abs.toFixed(1)}%`;
  return `${abs.toFixed(2)}%`;
}

function KpiCard({ label, value, trend, invertTrendColor = false, sub }: KpiCardProps) {
  const hasTrend = typeof trend === "number" && Number.isFinite(trend);
  const trendArrow = !hasTrend ? "→" : trend >= 0 ? "↑" : "↓";
  const trendText = !hasTrend ? "—" : formatTrendValue(trend);
  const trendIsGood = hasTrend && (invertTrendColor ? trend < 0 : trend >= 0);
  const trendTone = !hasTrend
    ? "bg-[var(--ds-bg-elevated)] text-[var(--ds-text-subtle)]"
    : trendIsGood
      ? "bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]"
      : "bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]";

  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm px-4 py-3">
      <p className="text-sm text-[var(--ds-text-subtle)] mb-1">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold text-[var(--ds-text)]">{value}</p>
        <p
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-semibold tabular-nums ${trendTone}`}
        >
          <span aria-hidden="true">{trendArrow}</span>
          <span>{trendText}</span>
        </p>
      </div>
      {sub && <p className="text-sm text-[var(--ds-text-subtle)] mt-0.5">{sub}</p>}
    </div>
  );
}

function previousValueFromChange(
  current: number,
  change: number | null | undefined,
): number | null {
  if (!Number.isFinite(current) || typeof change !== "number" || !Number.isFinite(change))
    return null;
  const factor = 1 + change / 100;
  if (factor === 0) return null;
  return current / factor;
}

function relativeChange(current: number, previous: number | null): number | null {
  if (
    !Number.isFinite(current) ||
    previous === null ||
    !Number.isFinite(previous) ||
    previous === 0
  )
    return null;
  return ((current - previous) / previous) * 100;
}

function formatMinute(ts: number, locale: DashboardLocale): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ts));
}

function intTicks(max: number): number[] {
  if (max <= 0) return [0];
  if (max <= 10) return Array.from({ length: max + 1 }, (_, i) => i);
  const step = max <= 50 ? 5 : max <= 200 ? 20 : Math.ceil(max / 10) * 2;
  const ticks: number[] = [];
  for (let i = 0; i <= max; i += step) ticks.push(i);
  if (ticks[ticks.length - 1] < max) ticks.push(max);
  return ticks;
}

function RealtimeCard() {
  const { locale, messages, formatNumber } = useI18n();
  const { effectiveTheme } = useTheme();
  const analyticsMessages = messages.dashboard.analytics;
  const isDark = effectiveTheme === "dark";
  const gridColor = isDark ? "#3d444d" : "#f1f0ef";
  const tickColor = isDark ? "#a8a29e" : "#9ca3af";
  const tooltipBg = isDark ? "oklch(0.19 0.006 38.2)" : "#ffffff";
  const tooltipBorder = isDark ? "oklch(0.30 0.008 38.2)" : "#e7e5e4";
  const tooltipColor = isDark ? "#fafaf9" : "#111827";
  const cursorColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const { data: realtime, isLoading: rtLoading } = useUmamiRealtime();
  const { data: active } = useUmamiActive();

  const chartData = useMemo(() => {
    const now = Date.now();
    const slots = Array.from({ length: 30 }, (_, i) => {
      const ts = Math.floor((now - (29 - i) * 60_000) / 60_000) * 60_000;
      return { ts, time: formatMinute(ts, locale), visitors: 0, pageviews: 0 };
    });

    if (realtime?.series) {
      const viewSeries = realtime.series.pageviews ?? realtime.series.views ?? [];
      const toMs = (x: number | string) =>
        typeof x === "string" ? new Date(x).getTime() : x > 1e12 ? x : x * 1000;

      for (const v of realtime.series.visitors ?? []) {
        const rounded = Math.floor(toMs(v.x) / 60_000) * 60_000;
        const slot = slots.find((s) => s.ts === rounded);
        if (slot) slot.visitors = v.y;
      }
      for (const v of viewSeries) {
        const rounded = Math.floor(toMs(v.x) / 60_000) * 60_000;
        const slot = slots.find((s) => s.ts === rounded);
        if (slot) slot.pageviews = v.y;
      }
    }

    return slots.map(({ time, visitors, pageviews }) => ({ time, visitors, pageviews }));
  }, [realtime, locale]);

  const topUrls = realtime?.urls
    ? Object.entries(realtime.urls)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];
  const rtMaxVal = Math.max(...chartData.map((d) => Math.max(d.visitors, d.pageviews)), 1);

  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <p className="text-base font-medium text-[var(--ds-text)]">
          {analyticsMessages.realtime.title}
        </p>

        {realtime && (
          <div className="flex items-center gap-5 ml-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-[var(--ds-text)]">
                {formatNumber(active?.visitors ?? realtime.totals.visitors ?? 0)}
              </span>
              <span className="text-sm text-[var(--ds-text-subtle)]">
                {active?.visitors != null
                  ? analyticsMessages.realtime.active5m
                  : analyticsMessages.visitors}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-[var(--ds-text)]">
                {formatNumber(realtime.totals.pageviews ?? realtime.totals.views ?? 0)}
              </span>
              <span className="text-sm text-[var(--ds-text-subtle)]">
                {analyticsMessages.realtime.pageviews30m}
              </span>
            </div>
          </div>
        )}

        <span className="ml-auto text-sm text-[var(--ds-text-subtle)]">
          {analyticsMessages.realtime.updatedEvery30s}
        </span>
      </div>

      {rtLoading ? (
        <div className="h-24 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
      ) : !realtime ? (
        <p className="text-sm text-[var(--ds-text-subtle)]">{analyticsMessages.noRealtimeData}</p>
      ) : (
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-2">
              <span className="flex items-center gap-1.5 text-sm text-[var(--ds-text-muted)]">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block shrink-0" />
                {analyticsMessages.visitors}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[var(--ds-text-muted)]">
                <span className="w-2.5 h-2.5 rounded-sm bg-stone-400 inline-block shrink-0" />
                {analyticsMessages.pageviews}
              </span>
            </div>
            <Suspense
              fallback={
                <div className="h-40 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
              }
            >
              <RealtimeBarsChart
                data={chartData}
                maxValue={rtMaxVal}
                ticks={intTicks(rtMaxVal)}
                cursorColor={cursorColor}
                theme={{
                  gridColor,
                  tickColor,
                  tooltipBg,
                  tooltipBorder,
                  tooltipColor,
                }}
                visitorsLabel={analyticsMessages.visitors}
                pageviewsLabel={analyticsMessages.pageviews}
                formatNumber={formatNumber}
              />
            </Suspense>
          </div>

          {topUrls.length > 0 && (
            <div className="w-1/4 shrink-0 pl-4 border-l border-[var(--ds-border-subtle)]">
              <p className="text-sm font-medium text-[var(--ds-text-muted)] mb-2">
                {analyticsMessages.topPages}
              </p>
              <div className="space-y-1.5">
                {topUrls.map(([url, count]) => (
                  <div key={url} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate text-[var(--ds-text-muted)]" title={url}>
                      {url === "/" ? analyticsMessages.home : url}
                    </span>
                    <span className="shrink-0 text-right text-sm text-[var(--ds-text-subtle)]">
                      {formatNumber(count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MetricListProps {
  title: string;
  type: UmamiMetricType;
  period: UmamiPeriod;
  renderLabel?: (x: string) => string;
}

function MetricList({ title, type, period, renderLabel }: MetricListProps) {
  const { messages, formatNumber } = useI18n();
  const analyticsMessages = messages.dashboard.analytics;
  const { data, isLoading } = useUmamiMetrics(type, period);
  const rows = data ?? [];
  const max = rows[0]?.y ?? 1;

  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4 flex flex-col gap-3">
      <p className="text-base font-medium text-[var(--ds-text)]">{title}</p>
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((k) => (
            <div key={k} className="h-7 bg-[var(--ds-bg-elevated)] rounded animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-[var(--ds-text-subtle)] py-4 text-center">
          {analyticsMessages.noData}
        </p>
      )}
      {!isLoading && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => {
            const rowText = toMetricText(row.x);
            const rowLabel = renderLabel
              ? renderLabel(rowText)
              : rowText || analyticsMessages.unknown;
            return (
              <li key={`${type}-${rowText}`} className="flex items-center gap-2 text-sm">
                <span className="shrink-0 w-5 text-base leading-none">
                  {type === "country" && rowText ? countryFlag(rowText) : null}
                </span>
                <span className="flex-1 truncate text-[var(--ds-text-muted)]" title={rowLabel}>
                  {rowLabel}
                </span>
                <div className="w-20 h-1.5 bg-[var(--ds-bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${Math.round((row.y / max) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 w-8 text-right text-sm text-[var(--ds-text-muted)]">
                  {formatNumber(row.y)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface TabbedMetricCardProps {
  title: string;
  tabs: readonly MetricTabConfig[];
  period: UmamiPeriod;
  storageKey: string;
}

function TabbedMetricCard({ title, tabs, period, storageKey }: TabbedMetricCardProps) {
  const { locale, messages, formatNumber } = useI18n();
  const analyticsMessages = messages.dashboard.analytics;
  const [activeType, setActiveType] = useState<UmamiMetricType>(tabs[0]?.value ?? "country");
  const activeTab = tabs.find((tab) => tab.value === activeType) ?? tabs[0];
  const { data, isLoading } = useUmamiMetrics(activeTab.value, period);
  const rows = (data ?? []).slice(0, 10);
  const total = rows.reduce((sum, row) => sum + row.y, 0);

  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-base font-semibold text-[var(--ds-text)]">{title}</p>
        <SegmentedControl
          value={activeType}
          onChange={setActiveType}
          storageKey={storageKey}
          options={tabs.map((tab) => ({ value: tab.value, label: tab.label }))}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-3 pb-2 border-b border-[var(--ds-border-subtle)] text-sm font-medium text-[var(--ds-text-subtle)]">
        <span>{activeTab.columnLabel}</span>
        <span className="text-right">{analyticsMessages.visitors}</span>
        <span className="text-right">{analyticsMessages.percentColumn}</span>
      </div>

      {isLoading ? (
        <div className="space-y-2 pt-3">
          {Array.from({ length: 6 }, (_, i) => `env-sk-${title}-${i}`).map((k) => (
            <div key={k} className="h-6 bg-[var(--ds-bg-elevated)] rounded animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--ds-text-subtle)] py-6 text-center">
          {analyticsMessages.noData}
        </p>
      ) : (
        <ul className="pt-2 space-y-1.5">
          {rows.map((row) => {
            const percentage = total > 0 ? Math.round((row.y / total) * 100) : 0;
            const rowText = toMetricText(row.x);
            let label = activeTab.renderLabel
              ? activeTab.renderLabel(rowText)
              : rowText || analyticsMessages.unknown;
            const EnvironmentIcon = getEnvironmentIcon(activeType, rowText);
            let leadingVisual: ReactNode = null;

            if (activeType === "country" || activeType === "region" || activeType === "city") {
              const parsed = parseLocationDisplay(
                activeType,
                rowText,
                locale,
                analyticsMessages.unknown,
              );
              label = parsed.label;
              leadingVisual = parsed.flag ? (
                <span className="shrink-0 leading-none">{parsed.flag}</span>
              ) : (
                <FaGlobe className="w-3.5 h-3.5 shrink-0 opacity-70" />
              );
            } else if (EnvironmentIcon) {
              leadingVisual = <EnvironmentIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />;
            }

            return (
              <li
                key={`${activeType}-${rowText}`}
                className="grid grid-cols-[1fr_auto_auto] gap-3 text-base py-0.5"
              >
                <span
                  className="min-w-0 flex items-center gap-2 text-[var(--ds-text-muted)]"
                  title={label}
                >
                  {leadingVisual}
                  <span className="truncate">{label}</span>
                </span>
                <span className="text-right text-[var(--ds-text)] tabular-nums">
                  {formatNumber(row.y)}
                </span>
                <span className="text-right text-[var(--ds-text-subtle)] tabular-nums">
                  {percentage}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Full analytics module (KPI cards, charts, environment/location tables).
 *
 * @returns Analytics dashboard section.
 */
export function AnalyticsSection() {
  const { user } = useAuth();
  const { locale, messages, formatNumber } = useI18n();
  const { effectiveTheme } = useTheme();
  const analyticsMessages = messages.dashboard.analytics;
  const periodStorageKey = getSegmentedStorageKey(user?.id, "analytics:period");
  const isDark = effectiveTheme === "dark";
  const gridColor = isDark ? "#3d444d" : "#f1f0ef";
  const tickColor = isDark ? "#a8a29e" : "#9ca3af";
  const tooltipBg = isDark ? "oklch(0.19 0.006 38.2)" : "#ffffff";
  const tooltipBorder = isDark ? "oklch(0.30 0.008 38.2)" : "#e7e5e4";
  const tooltipColor = isDark ? "#fafaf9" : "#111827";

  const [period, setPeriod] = useState<UmamiPeriod>(() => loadPeriod(periodStorageKey));

  const handlePeriodChange = useCallback((p: UmamiPeriod) => {
    setPeriod(p);
  }, []);
  const periodOptions = useMemo<{ label: string; value: UmamiPeriod }[]>(
    () => [
      { value: "today", label: analyticsMessages.periods.today },
      { value: "7d", label: analyticsMessages.periods.d7 },
      { value: "30d", label: analyticsMessages.periods.d30 },
      { value: "60d", label: analyticsMessages.periods.d60 },
      { value: "90d", label: analyticsMessages.periods.d90 },
    ],
    [analyticsMessages],
  );
  const environmentTabs = useMemo<readonly MetricTabConfig[]>(
    () => [
      {
        label: analyticsMessages.browser,
        value: "browser",
        columnLabel: analyticsMessages.browser,
      },
      { label: analyticsMessages.os, value: "os", columnLabel: analyticsMessages.os },
      {
        label: analyticsMessages.devices,
        value: "device",
        columnLabel: analyticsMessages.device,
      },
    ],
    [analyticsMessages],
  );
  const locationTabs = useMemo<readonly MetricTabConfig[]>(
    () => [
      {
        label: analyticsMessages.countries,
        value: "country",
        columnLabel: analyticsMessages.country,
      },
      { label: analyticsMessages.regions, value: "region", columnLabel: analyticsMessages.region },
      { label: analyticsMessages.cities, value: "city", columnLabel: analyticsMessages.city },
    ],
    [analyticsMessages],
  );
  const { data: stats, isLoading: statsLoading } = useUmamiStats(period);
  const { data: pageviews, isLoading: pvLoading } = useUmamiPageviews(period);

  const chartData = useMemo(
    () =>
      pageviews?.pageviews.map((pv) => ({
        label: formatLabel(pv.x, period, locale),
        pageviews: pv.y,
        visitors: pageviews.sessions.find((s) => s.x === pv.x)?.y ?? 0,
      })) ?? [],
    [pageviews, period, locale],
  );

  const pvMaxVal = Math.max(...chartData.map((d) => Math.max(d.visitors, d.pageviews)), 1);

  const visitsVal = stats?.visits?.value ?? 0;
  const bouncesVal = stats?.bounces?.value ?? 0;
  const bounceRate = visitsVal > 0 ? Math.round((bouncesVal / visitsVal) * 100) : 0;
  const bounceRateRaw = visitsVal > 0 ? bouncesVal / visitsVal : 0;

  const totalTime = stats?.totaltime?.value ?? 0;
  const avgDurationSeconds = visitsVal > 0 ? totalTime / visitsVal : 0;
  const avgDuration = stats
    ? formatDuration(
        Math.round(totalTime / Math.max(visitsVal, 1)),
        analyticsMessages.durationUnits,
      )
    : "–";
  const previousVisits = previousValueFromChange(visitsVal, stats?.visits?.change);
  const previousBounces = previousValueFromChange(bouncesVal, stats?.bounces?.change);
  const previousBounceRate =
    previousVisits !== null && previousVisits > 0 && previousBounces !== null
      ? previousBounces / previousVisits
      : null;
  const previousTotalTime = previousValueFromChange(totalTime, stats?.totaltime?.change);
  const previousAvgDuration =
    previousVisits !== null && previousVisits > 0 && previousTotalTime !== null
      ? previousTotalTime / previousVisits
      : null;

  const hasStats = stats && stats.visitors != null && stats.pageviews != null;

  return (
    <div>
      <RealtimeCard />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--ds-text)]">{analyticsMessages.title}</h2>
        <SegmentedControl
          value={period}
          onChange={handlePeriodChange}
          storageKey={periodStorageKey}
          options={periodOptions}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {statsLoading ? (
          Array.from({ length: 4 }, (_, i) => `kpi-${i}`).map((k) => (
            <div key={k} className="h-16 bg-[var(--ds-bg-elevated)] rounded-xl animate-pulse" />
          ))
        ) : hasStats ? (
          <>
            <KpiCard
              label={analyticsMessages.visitors}
              value={formatNumber(stats.visitors?.value ?? 0)}
              trend={stats.visitors?.change ?? null}
            />
            <KpiCard
              label={analyticsMessages.pageviews}
              value={formatNumber(stats.pageviews?.value ?? 0)}
              trend={stats.pageviews?.change ?? null}
            />
            <KpiCard
              label={analyticsMessages.bounceRate}
              value={`${bounceRate} %`}
              trend={relativeChange(bounceRateRaw, previousBounceRate)}
              invertTrendColor
            />
            <KpiCard
              label={analyticsMessages.averageDuration}
              value={avgDuration}
              trend={relativeChange(avgDurationSeconds, previousAvgDuration)}
            />
          </>
        ) : (
          <div className="col-span-4 text-sm text-[var(--ds-text-subtle)] py-2">
            {analyticsMessages.umamiNotConfigured}
          </div>
        )}
      </div>

      {(pvLoading || chartData.length > 0) && (
        <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-medium text-[var(--ds-text)]">
              {analyticsMessages.traffic}
            </p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-[var(--ds-text-muted)]">
                <span className="w-3 h-0.5 rounded-full bg-amber-400 inline-block" />
                {analyticsMessages.visitors}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[var(--ds-text-muted)]">
                <span className="w-3 h-0.5 rounded-full bg-stone-400 inline-block" />
                {analyticsMessages.pageviews}
              </span>
            </div>
          </div>
          {pvLoading ? (
            <div className="h-40 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
          ) : (
            <Suspense
              fallback={
                <div className="h-40 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
              }
            >
              <TrafficAreaChart
                data={chartData}
                maxValue={pvMaxVal}
                ticks={intTicks(pvMaxVal)}
                theme={{
                  gridColor,
                  tickColor,
                  tooltipBg,
                  tooltipBorder,
                  tooltipColor,
                }}
                visitorsLabel={analyticsMessages.visitors}
                pageviewsLabel={analyticsMessages.pageviews}
                formatNumber={formatNumber}
              />
            </Suspense>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-3">
          <MetricList
            title={analyticsMessages.topPages}
            type="url"
            period={period}
            renderLabel={(x) => (x === "/" ? analyticsMessages.home : x)}
          />
        </div>
        <div className="md:col-span-2">
          <MetricList
            title={analyticsMessages.sources}
            type="referrer"
            period={period}
            renderLabel={(x) => x || analyticsMessages.direct}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <TabbedMetricCard
          title={analyticsMessages.environment}
          tabs={environmentTabs}
          period={period}
          storageKey={getSegmentedStorageKey(user?.id, "analytics:environment")}
        />
        <TabbedMetricCard
          title={analyticsMessages.location}
          tabs={locationTabs}
          period={period}
          storageKey={getSegmentedStorageKey(user?.id, "analytics:location")}
        />
      </div>
    </div>
  );
}
