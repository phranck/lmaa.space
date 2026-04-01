import { Suspense, lazy, useMemo } from "react";

import { useI18n } from "@/context/I18nContext.tsx";
import { useTheme } from "@/context/ThemeContext.tsx";
import { formatMinute, intTicks } from "@/features/analytics/analytics-utils.ts";
import { useUmamiActive, useUmamiRealtime } from "@/features/analytics/hooks/useUmamiStats.ts";

const RealtimeBarsChart = lazy(() =>
  import("./AnalyticsCharts.tsx").then((module) => ({ default: module.RealtimeBarsChart })),
);

export function RealtimeCard() {
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
