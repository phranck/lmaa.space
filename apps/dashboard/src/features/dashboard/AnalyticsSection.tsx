import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useTheme } from "@/context/ThemeContext.tsx";
import {
  type UmamiMetricType,
  type UmamiPeriod,
  useUmamiActive,
  useUmamiMetrics,
  useUmamiPageviews,
  useUmamiRealtime,
  useUmamiStats,
} from "@/features/dashboard/hooks/useUmamiStats.ts";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS: { label: string; value: UmamiPeriod }[] = [
  { label: "Heute", value: "today" },
  { label: "7 Tage", value: "7d" },
  { label: "30 Tage", value: "30d" },
  { label: "60 Tage", value: "60d" },
  { label: "90 Tage", value: "90d" },
];

interface MetricTabConfig {
  label: string;
  value: UmamiMetricType;
  columnLabel: string;
  renderLabel?: (x: string) => string;
  showCountryFlag?: boolean;
}

const ENVIRONMENT_TABS: readonly MetricTabConfig[] = [
  { label: "Browser", value: "browser", columnLabel: "Browser" },
  { label: "OS", value: "os", columnLabel: "OS" },
  { label: "Geräte", value: "device", columnLabel: "Gerät" },
];

const LOCATION_TABS: readonly MetricTabConfig[] = [
  { label: "Länder", value: "country", columnLabel: "Land", showCountryFlag: true },
  { label: "Regionen", value: "region", columnLabel: "Region" },
  { label: "Städte", value: "city", columnLabel: "Stadt" },
];

const STORAGE_KEY = "analytics-period";

function loadPeriod(): UmamiPeriod {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && PERIODS.some((p) => p.value === saved)) return saved as UmamiPeriod;
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatLabel(x: string, period: UmamiPeriod): string {
  if (period === "today") {
    const h = new Date(x).getHours();
    return `${h}:00`;
  }
  const d = new Date(x);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm px-4 py-3">
      <p className="text-xs text-[var(--ds-text-subtle)] mb-1">{label}</p>
      <p className="text-xl font-semibold text-[var(--ds-text)]">{value}</p>
      {sub && <p className="text-xs text-[var(--ds-text-subtle)] mt-0.5">{sub}</p>}
    </div>
  );
}

function formatMinute(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  const gridColor = isDark ? "#3d444d" : "#f1f0ef";
  const tickColor = isDark ? "#a8a29e" : "#9ca3af";
  const tooltipBg = isDark ? "oklch(0.19 0.006 38.2)" : "#ffffff";
  const tooltipBorder = isDark ? "oklch(0.30 0.008 38.2)" : "#e7e5e4";
  const tooltipColor = isDark ? "#fafaf9" : "#111827";
  const cursorColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const { data: realtime, isLoading: rtLoading } = useUmamiRealtime();
  const { data: active } = useUmamiActive();

  const chartData = (() => {
    const now = Date.now();
    // Build full 30-minute grid (one slot per minute, oldest first)
    const slots = Array.from({ length: 30 }, (_, i) => {
      const ts = Math.floor((now - (29 - i) * 60_000) / 60_000) * 60_000;
      return { ts, time: formatMinute(ts), Besucher: 0, Aufrufe: 0 };
    });

    if (realtime?.series) {
      // Umami v2 uses "pageviews", older versions use "views" — support both
      const viewSeries = realtime.series.pageviews ?? realtime.series.views ?? [];
      // Umami may return x as seconds, milliseconds, or ISO string — normalise to ms
      const toMs = (x: number | string) =>
        typeof x === "string" ? new Date(x).getTime() : x > 1e12 ? x : x * 1000;
      for (const v of realtime.series.visitors ?? []) {
        const rounded = Math.floor(toMs(v.x) / 60_000) * 60_000;
        const slot = slots.find((s) => s.ts === rounded);
        if (slot) slot.Besucher = v.y;
      }
      for (const v of viewSeries) {
        const rounded = Math.floor(toMs(v.x) / 60_000) * 60_000;
        const slot = slots.find((s) => s.ts === rounded);
        if (slot) slot.Aufrufe = v.y;
      }
    }

    return slots.map(({ time, Besucher, Aufrufe }) => ({ time, Besucher, Aufrufe }));
  })();

  const topUrls = realtime?.urls
    ? Object.entries(realtime.urls)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];
  const rtMaxVal = Math.max(...chartData.map((d) => Math.max(d.Besucher, d.Aufrufe)), 1);

  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <p className="text-sm font-medium text-[var(--ds-text)]">Live</p>

        {/* KPIs */}
        {realtime && (
          <div className="flex items-center gap-5 ml-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[var(--ds-text)]">
                {active?.visitors ?? realtime.totals.visitors}
              </span>
              <span className="text-xs text-[var(--ds-text-subtle)]">
                {active?.visitors != null ? "aktiv (5 min)" : "Besucher"}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[var(--ds-text)]">
                {realtime.totals.pageviews ?? realtime.totals.views ?? 0}
              </span>
              <span className="text-xs text-[var(--ds-text-subtle)]">Aufrufe (30 min)</span>
            </div>
          </div>
        )}

        <span className="ml-auto text-xs text-[var(--ds-text-subtle)]">aktualisiert alle 30 s</span>
      </div>

      {rtLoading ? (
        <div className="h-24 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
      ) : !realtime ? (
        <p className="text-xs text-[var(--ds-text-subtle)]">Keine Realtime-Daten</p>
      ) : (
        <>
          {/* Legende */}
          <div className="flex gap-4 items-start">
            {/* Legende + Bar Chart (3/4) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-2">
                <span className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block shrink-0" />
                  Besucher
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-stone-400 inline-block shrink-0" />
                  Seitenaufrufe
                </span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                  barSize={5}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={true} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    domain={[0, rtMaxVal]}
                    ticks={intTicks(rtMaxVal)}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: `1px solid ${tooltipBorder}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      background: tooltipBg,
                      color: tooltipColor,
                    }}
                    cursor={{ fill: cursorColor }}
                  />
                  <Bar dataKey="Besucher" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Aufrufe" fill="#a8a29e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top URLs (1/4) */}
            {topUrls.length > 0 && (
              <div className="w-1/4 shrink-0 pl-4 border-l border-[var(--ds-border-subtle)]">
                <p className="text-xs font-medium text-[var(--ds-text-muted)] mb-2">Top Seiten</p>
                <div className="space-y-1.5">
                  {topUrls.map(([url, count]) => (
                    <div key={url} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate text-[var(--ds-text-muted)]" title={url}>
                        {url === "/" ? "Startseite" : url}
                      </span>
                      <span className="shrink-0 text-right text-[var(--ds-text-subtle)]">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
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
  const { data, isLoading } = useUmamiMetrics(type, period);
  const rows = data ?? [];
  const max = rows[0]?.y ?? 1;

  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-[var(--ds-text)]">{title}</p>
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((k) => (
            <div key={k} className="h-7 bg-[var(--ds-bg-elevated)] rounded animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-[var(--ds-text-subtle)] py-4 text-center">Keine Daten</p>
      )}
      {!isLoading && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.x} className="flex items-center gap-2 text-xs">
              <span className="shrink-0 w-5 text-base leading-none">
                {type === "country" ? countryFlag(row.x) : null}
              </span>
              <span
                className="flex-1 truncate text-[var(--ds-text-muted)]"
                title={renderLabel ? renderLabel(row.x) : row.x}
              >
                {renderLabel ? renderLabel(row.x) : row.x}
              </span>
              <div className="w-20 h-1.5 bg-[var(--ds-bg-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${Math.round((row.y / max) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 w-8 text-right text-[var(--ds-text-muted)]">{row.y}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface TabbedMetricCardProps {
  title: string;
  tabs: readonly MetricTabConfig[];
  period: UmamiPeriod;
}

function TabbedMetricCard({ title, tabs, period }: TabbedMetricCardProps) {
  const [activeType, setActiveType] = useState<UmamiMetricType>(tabs[0]?.value ?? "country");
  const activeTab = tabs.find((tab) => tab.value === activeType) ?? tabs[0];
  const { data, isLoading } = useUmamiMetrics(activeTab.value, period);
  const rows = (data ?? []).slice(0, 10);
  const total = rows.reduce((sum, row) => sum + row.y, 0);

  return (
    <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-[var(--ds-text)]">{title}</p>
        <SegmentedControl
          value={activeType}
          onChange={setActiveType}
          options={tabs.map((tab) => ({ value: tab.value, label: tab.label }))}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-3 pb-2 border-b border-[var(--ds-border-subtle)] text-xs font-medium text-[var(--ds-text-subtle)]">
        <span>{activeTab.columnLabel}</span>
        <span className="text-right">Besucher</span>
        <span className="text-right">%</span>
      </div>

      {isLoading ? (
        <div className="space-y-2 pt-3">
          {Array.from({ length: 6 }, (_, i) => `env-sk-${title}-${i}`).map((k) => (
            <div key={k} className="h-6 bg-[var(--ds-bg-elevated)] rounded animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-[var(--ds-text-subtle)] py-6 text-center">Keine Daten</p>
      ) : (
        <ul className="pt-2 space-y-1.5">
          {rows.map((row) => {
            const percentage = total > 0 ? Math.round((row.y / total) * 100) : 0;
            const showFlag = activeTab.showCountryFlag === true && /^[A-Za-z]{2}$/.test(row.x);
            const label = activeTab.renderLabel ? activeTab.renderLabel(row.x) : row.x || "(leer)";

            return (
              <li key={row.x} className="grid grid-cols-[1fr_auto_auto] gap-3 text-sm py-0.5">
                <span className="truncate text-[var(--ds-text-muted)]" title={label}>
                  {showFlag ? `${countryFlag(row.x)} ` : ""}
                  {label}
                </span>
                <span className="text-right text-[var(--ds-text)] tabular-nums">
                  {row.y.toLocaleString("de")}
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

export function AnalyticsSection() {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  const gridColor = isDark ? "#3d444d" : "#f1f0ef";
  const tickColor = isDark ? "#a8a29e" : "#9ca3af";
  const tooltipBg = isDark ? "oklch(0.19 0.006 38.2)" : "#ffffff";
  const tooltipBorder = isDark ? "oklch(0.30 0.008 38.2)" : "#e7e5e4";
  const tooltipColor = isDark ? "#fafaf9" : "#111827";

  const [period, setPeriod] = useState<UmamiPeriod>(loadPeriod);

  function handlePeriodChange(p: UmamiPeriod) {
    setPeriod(p);
    localStorage.setItem(STORAGE_KEY, p);
  }
  const { data: stats, isLoading: statsLoading } = useUmamiStats(period);
  const { data: pageviews, isLoading: pvLoading } = useUmamiPageviews(period);

  const chartData =
    pageviews?.pageviews.map((pv) => ({
      label: formatLabel(pv.x, period),
      Seitenaufrufe: pv.y,
      Besucher: pageviews.sessions.find((s) => s.x === pv.x)?.y ?? 0,
    })) ?? [];

  const pvMaxVal = Math.max(...chartData.map((d) => Math.max(d.Besucher, d.Seitenaufrufe)), 1);

  const visitsVal = stats?.visits?.value ?? 0;
  const bouncesVal = stats?.bounces?.value ?? 0;
  const bounceRate = visitsVal > 0 ? Math.round((bouncesVal / visitsVal) * 100) : 0;

  const totalTime = stats?.totaltime?.value ?? 0;
  const avgDuration = stats ? formatDuration(Math.round(totalTime / Math.max(visitsVal, 1))) : "–";

  const hasStats = stats && stats.visitors != null && stats.pageviews != null;

  return (
    <div className="mt-8">
      <RealtimeCard />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--ds-text)]">Analytics</h2>
        <SegmentedControl value={period} onChange={handlePeriodChange} options={PERIODS} />
      </div>

      {/* KPI-Leiste */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {statsLoading ? (
          Array.from({ length: 4 }, (_, i) => `kpi-${i}`).map((k) => (
            <div key={k} className="h-16 bg-[var(--ds-bg-elevated)] rounded-xl animate-pulse" />
          ))
        ) : hasStats ? (
          <>
            <KpiCard label="Besucher" value={(stats.visitors?.value ?? 0).toLocaleString("de")} />
            <KpiCard
              label="Seitenaufrufe"
              value={(stats.pageviews?.value ?? 0).toLocaleString("de")}
            />
            <KpiCard label="Absprungrate" value={`${bounceRate} %`} />
            <KpiCard label="Ø Verweildauer" value={avgDuration} />
          </>
        ) : (
          <div className="col-span-4 text-xs text-[var(--ds-text-subtle)] py-2">
            Umami nicht konfiguriert (UMAMI_URL, UMAMI_USERNAME, UMAMI_PASSWORD, UMAMI_WEBSITE_ID).
          </div>
        )}
      </div>

      {/* Traffic Chart */}
      {(pvLoading || chartData.length > 0) && (
        <div className="bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--ds-text)]">Traffic</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)]">
                <span className="w-3 h-0.5 rounded-full bg-amber-400 inline-block" />
                Besucher
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)]">
                <span className="w-3 h-0.5 rounded-full bg-stone-400 inline-block" />
                Seitenaufrufe
              </span>
            </div>
          </div>
          {pvLoading ? (
            <div className="h-40 bg-[var(--ds-bg-elevated)] rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradPageviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a8a29e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a8a29e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, pvMaxVal]}
                  ticks={intTicks(pvMaxVal)}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: `1px solid ${tooltipBorder}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    background: tooltipBg,
                    color: tooltipColor,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Seitenaufrufe"
                  stroke="#a8a29e"
                  strokeWidth={2}
                  fill="url(#gradPageviews)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="Besucher"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradVisitors)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Top Seiten + Quellen */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-3">
          <MetricList
            title="Top Seiten"
            type="url"
            period={period}
            renderLabel={(x) => (x === "/" ? "Startseite" : x)}
          />
        </div>
        <div className="md:col-span-2">
          <MetricList
            title="Quellen"
            type="referrer"
            period={period}
            renderLabel={(x) => x || "(Direkt)"}
          />
        </div>
      </div>

      {/* Environment + Location */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <TabbedMetricCard title="Environment" tabs={ENVIRONMENT_TABS} period={period} />
        <TabbedMetricCard title="Location" tabs={LOCATION_TABS} period={period} />
      </div>
    </div>
  );
}
