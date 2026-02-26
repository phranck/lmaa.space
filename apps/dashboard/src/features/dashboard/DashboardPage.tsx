import { AnalyticsLoadingFallback } from "@/components/AnalyticsLoadingFallback.tsx";
import { DashboardInfoCard } from "@/components/ui/DashboardInfoCard.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminStats } from "@/features/dashboard/hooks/useAdminStats.ts";
import { Suspense, lazy } from "react";

const AnalyticsSection = lazy(() =>
  import("@/features/dashboard/AnalyticsSection.tsx").then((m) => ({
    default: m.AnalyticsSection,
  })),
);

export function DashboardPage() {
  const { messages } = useI18n();
  const dashboardMessages = messages.dashboard;
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div>
        <PageHeader title={dashboardMessages.overviewTitle} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((key) => (
            <div
              key={key}
              className="h-28 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={dashboardMessages.overviewTitle} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <DashboardInfoCard label={dashboardMessages.cards.shops} value={stats?.shops ?? 0} />
        <DashboardInfoCard
          label={dashboardMessages.cards.categories}
          value={stats?.categories ?? 0}
        />
        <DashboardInfoCard
          label={dashboardMessages.cards.pendingSuggestions}
          value={stats?.pendingSubmissions ?? 0}
          accent={(stats?.pendingSubmissions ?? 0) > 0}
          sub={
            (stats?.pendingSubmissions ?? 0) > 0
              ? dashboardMessages.cards.waitingForReview
              : undefined
          }
          href={(stats?.pendingSubmissions ?? 0) > 0 ? "/meldungen" : undefined}
        />
        <DashboardInfoCard
          label={dashboardMessages.cards.suggestionsTotal}
          value={stats?.totalSubmissions ?? 0}
          sub={dashboardMessages.cards.allTime}
        />
        <DashboardInfoCard
          label={dashboardMessages.cards.brokenLinks}
          value={stats?.deadLinkReports ?? 0}
          accent={(stats?.deadLinkReports ?? 0) > 0}
          sub={
            (stats?.deadLinkReports ?? 0) > 0 ? dashboardMessages.cards.shopsReported : undefined
          }
          href={(stats?.deadLinkReports ?? 0) > 0 ? "/meldungen?tab=defekte-links" : undefined}
        />
      </div>

      <Suspense fallback={<AnalyticsLoadingFallback />}>
        <AnalyticsSection />
      </Suspense>
    </div>
  );
}
