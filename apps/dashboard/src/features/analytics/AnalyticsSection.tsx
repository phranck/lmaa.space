import {
  BrowsersIcon,
  ChartLineIcon,
  CursorClickIcon,
  FileTextIcon,
  GlobeIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  StorefrontIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";

import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useTheme } from "@/context/ThemeContext.tsx";
import {
  type MetricTabConfig,
  formatDuration,
  formatLabel,
  intTicks,
  loadPeriod,
  previousValueFromChange,
  relativeChange,
} from "@/features/analytics/analytics-utils.ts";
import { EventListCard } from "@/features/analytics/AnalyticsListCard.tsx";
import {
  type UmamiPeriod,
  useUmamiCategoryClicks,
  useUmamiInteractionTotal,
  useUmamiPageviews,
  useUmamiSearchTerms,
  useUmamiShopVisitClicks,
  useUmamiShopVisitTotal,
  useUmamiSiteLinkClicks,
  useUmamiStats,
} from "@/features/analytics/hooks/useUmamiStats.ts";
import { KpiCard } from "@/features/analytics/KpiCard.tsx";
import { MetricList } from "@/features/analytics/MetricList.tsx";
import { RealtimeCard } from "@/features/analytics/RealtimeCard.tsx";
import { TabbedMetricCard } from "@/features/analytics/TabbedMetricCard.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

const TrafficAreaChart = lazy(() =>
  import("./AnalyticsCharts.tsx").then((module) => ({ default: module.TrafficAreaChart })),
);

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
    setPeriod(() => p);
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
  const { data: searchTerms, isLoading: searchTermsLoading } = useUmamiSearchTerms(period);
  const { data: categoryClicks, isLoading: categoryClicksLoading } = useUmamiCategoryClicks(period);
  const { data: shopVisitClicks, isLoading: shopVisitClicksLoading } =
    useUmamiShopVisitClicks(period);
  const { data: shopVisitTotal, isLoading: shopVisitTotalLoading } = useUmamiShopVisitTotal(period);
  const { data: siteLinkClicks, isLoading: siteLinkClicksLoading } = useUmamiSiteLinkClicks(period);
  const { data: interactionTotal, isLoading: interactionTotalLoading } =
    useUmamiInteractionTotal(period);

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
    <div className="pb-3">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {statsLoading ? (
          Array.from({ length: 6 }, (_, i) => `kpi-${i}`).map((k) => (
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
            <KpiCard
              label={analyticsMessages.shopVisitClicks}
              value={
                shopVisitTotalLoading
                  ? "–"
                  : shopVisitTotal
                    ? formatNumber(shopVisitTotal.total)
                    : "–"
              }
            />
            <KpiCard
              label={analyticsMessages.websiteInteractions}
              value={
                interactionTotalLoading
                  ? "–"
                  : interactionTotal
                    ? formatNumber(interactionTotal.total)
                    : "–"
              }
            />
          </>
        ) : (
          <div className="col-span-6 text-sm text-[var(--ds-text-subtle)] py-2">
            {analyticsMessages.umamiNotConfigured}
          </div>
        )}
      </div>

      {(pvLoading || chartData.length > 0) && (
        <div className="mb-4">
          <DashboardSection>
            <DashboardSection.Header
              icon={<ChartLineIcon weight="duotone" className="w-4 h-4" />}
              title={analyticsMessages.traffic}
              addOn={
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
              }
            />
            <DashboardSection.Body>
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
            </DashboardSection.Body>
          </DashboardSection>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
        <EventListCard
          title={analyticsMessages.topSearchTerms}
          icon={<MagnifyingGlassIcon weight="duotone" className="w-4 h-4" />}
          rows={searchTerms ?? []}
          isLoading={searchTermsLoading}
        />
        <EventListCard
          title={analyticsMessages.topCategoriesByClicks}
          icon={<TagIcon weight="duotone" className="w-4 h-4" />}
          rows={categoryClicks ?? []}
          isLoading={categoryClicksLoading}
        />
        <EventListCard
          title={analyticsMessages.topShopsByVisitClicks}
          icon={<StorefrontIcon weight="duotone" className="w-4 h-4" />}
          rows={shopVisitClicks ?? []}
          isLoading={shopVisitClicksLoading}
        />
        <EventListCard
          title={analyticsMessages.topLinkClicks}
          icon={<CursorClickIcon weight="duotone" className="w-4 h-4" />}
          rows={siteLinkClicks ?? []}
          isLoading={siteLinkClicksLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
        <MetricList
          title={analyticsMessages.topPages}
          icon={<FileTextIcon weight="duotone" className="w-4 h-4" />}
          type="url"
          period={period}
          renderLabel={(x) => (x === "/" ? analyticsMessages.home : x)}
        />
        <MetricList
          title={analyticsMessages.sources}
          icon={<LinkIcon weight="duotone" className="w-4 h-4" />}
          type="referrer"
          period={period}
          renderLabel={(x) => x || analyticsMessages.direct}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <TabbedMetricCard
          title={analyticsMessages.environment}
          icon={<BrowsersIcon weight="duotone" className="w-4 h-4" />}
          tabs={environmentTabs}
          period={period}
          storageKey={getSegmentedStorageKey(user?.id, "analytics:environment")}
        />
        <TabbedMetricCard
          title={analyticsMessages.location}
          icon={<GlobeIcon weight="duotone" className="w-4 h-4" />}
          tabs={locationTabs}
          period={period}
          storageKey={getSegmentedStorageKey(user?.id, "analytics:location")}
        />
      </div>
    </div>
  );
}
