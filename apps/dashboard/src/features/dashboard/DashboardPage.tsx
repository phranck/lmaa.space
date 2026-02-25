import { lazy, Suspense } from "react";
import { DashboardInfoCard } from "@/components/ui/DashboardInfoCard.tsx";
import { AnalyticsLoadingFallback } from "@/components/AnalyticsLoadingFallback.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useAdminStats } from "@/features/dashboard/hooks/useAdminStats.ts";

const AnalyticsSection = lazy(() =>
  import("@/features/dashboard/AnalyticsSection.tsx").then((m) => ({
    default: m.AnalyticsSection,
  })),
);

export function DashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Übersicht" />
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
      <PageHeader title="Übersicht" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <DashboardInfoCard label="Shops" value={stats?.shops ?? 0} />
        <DashboardInfoCard label="Kategorien" value={stats?.categories ?? 0} />
        <DashboardInfoCard
          label="Offene Vorschläge"
          value={stats?.pendingSubmissions ?? 0}
          accent={(stats?.pendingSubmissions ?? 0) > 0}
          sub={(stats?.pendingSubmissions ?? 0) > 0 ? "Warten auf Review" : undefined}
          href={(stats?.pendingSubmissions ?? 0) > 0 ? "/meldungen" : undefined}
        />
        <DashboardInfoCard
          label="Vorschläge gesamt"
          value={stats?.totalSubmissions ?? 0}
          sub="aller Zeiten"
        />
        <DashboardInfoCard
          label="Defekte Links"
          value={stats?.deadLinkReports ?? 0}
          accent={(stats?.deadLinkReports ?? 0) > 0}
          sub={(stats?.deadLinkReports ?? 0) > 0 ? "Shops gemeldet" : undefined}
          href={(stats?.deadLinkReports ?? 0) > 0 ? "/meldungen?tab=defekte-links" : undefined}
        />
      </div>

      <Suspense fallback={<AnalyticsLoadingFallback />}>
        <AnalyticsSection />
      </Suspense>
    </div>
  );
}
