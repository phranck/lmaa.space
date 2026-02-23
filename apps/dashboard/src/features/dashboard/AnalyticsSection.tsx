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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatMinute(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function RealtimeCard() {
  const { data: realtime, isLoading: rtLoading } = useUmamiRealtime();
  const { data: active } = useUmamiActive();

  const chartData = (() => {
    if (!realtime?.series) return [];
    const byTime = new Map<number, { Besucher: number; Aufrufe: number }>();
    for (const v of realtime.series.visitors) {
      byTime.set(v.x, { Besucher: v.y, Aufrufe: 0 });
    }
    for (const v of realtime.series.views) {
      const entry = byTime.get(v.x);
      if (entry) entry.Aufrufe = v.y;
      else byTime.set(v.x, { Besucher: 0, Aufrufe: v.y });
    }
    return Array.from(byTime.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ts, vals]) => ({ time: formatMinute(ts), ...vals }));
  })();

  const topUrls = realtime?.urls
    ? Object.entries(realtime.urls)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];
  const maxViews = topUrls[0]?.[1] ?? 1;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <p className="text-sm font-medium text-gray-700">Live</p>

        {/* KPIs */}
        {realtime && (
          <div className="flex items-center gap-5 ml-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-gray-900">
                {active?.visitors ?? realtime.totals.visitors}
              </span>
              <span className="text-xs text-gray-400">
                {active?.visitors != null ? "aktiv (5 min)" : "Besucher"}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-gray-900">{realtime.totals.views}</span>
              <span className="text-xs text-gray-400">Aufrufe (30 min)</span>
            </div>
          </div>
        )}

        <span className="ml-auto text-xs text-gray-400">aktualisiert alle 30 s</span>
      </div>

      {rtLoading ? (
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
      ) : !realtime ? (
        <p className="text-xs text-gray-400">Keine Realtime-Daten</p>
      ) : (
        <>
          {/* Legende */}
          <div className="flex items-center gap-4 mb-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block shrink-0" />
              Besucher
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-stone-400 inline-block shrink-0" />
              Seitenaufrufe
            </span>
          </div>

          {/* Bar Chart */}
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
              barSize={5}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ef" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e7e5e4",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
              />
              <Bar dataKey="Besucher" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Aufrufe" fill="#a8a29e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Top URLs (Realtime – letzte 30 min) */}
          {topUrls.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Meistaufgerufene Seiten (letzte 30 min)
              </p>
              <div className="space-y-1.5">
                {topUrls.map(([url, count]) => (
                  <div key={url} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate text-gray-500" title={url}>
                      {url === "/" ? "Startseite" : url}
                    </span>
                    <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${Math.round((count / maxViews) * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 w-5 text-right text-gray-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((k) => (
            <div key={k} className="h-7 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-gray-400 py-4 text-center">Keine Daten</p>
      )}
      {!isLoading && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.x} className="flex items-center gap-2 text-xs">
              <span className="shrink-0 w-5 text-base leading-none">
                {type === "country" ? countryFlag(row.x) : null}
              </span>
              <span
                className="flex-1 truncate text-gray-600"
                title={renderLabel ? renderLabel(row.x) : row.x}
              >
                {renderLabel ? renderLabel(row.x) : row.x}
              </span>
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${Math.round((row.y / max) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 w-8 text-right text-gray-500">{row.y}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AnalyticsSection() {
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
        <h2 className="text-sm font-semibold text-gray-700">Analytics</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePeriodChange(p.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI-Leiste */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {statsLoading ? (
          Array.from({ length: 4 }, (_, i) => `kpi-${i}`).map((k) => (
            <div key={k} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
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
          <div className="col-span-4 text-xs text-gray-400 py-2">
            Umami nicht konfiguriert (UMAMI_URL, UMAMI_USERNAME, UMAMI_PASSWORD, UMAMI_WEBSITE_ID).
          </div>
        )}
      </div>

      {/* Traffic Chart */}
      {(pvLoading || chartData.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Traffic</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-0.5 rounded-full bg-amber-400 inline-block" />
                Besucher
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-0.5 rounded-full bg-stone-400 inline-block" />
                Seitenaufrufe
              </span>
            </div>
          </div>
          {pvLoading ? (
            <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ef" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e7e5e4",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
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

      {/* Top Seiten + Länder */}
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
          <MetricList title="Länder" type="country" period={period} />
        </div>
      </div>
    </div>
  );
}
