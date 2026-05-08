import { DashboardInfoCard } from "@/components/ui/DashboardInfoCard.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminStats } from "@/features/overview/hooks/useAdminStats.ts";

/**
 * Landing page for authenticated dashboard users.
 *
 * @returns Dashboard route component.
 */
export function DashboardPage() {
  const { messages } = useI18n();
  const dashboardMessages = messages.dashboard;
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader title={dashboardMessages.overviewTitle} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }, (_, i) => `sk-${i}`).map((key) => (
            <div
              key={key}
              className="h-28 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] animate-pulse"
            />
          ))}
        </div>
      </PageLayout>
    );
  }

  const unresolvedBgErrors = stats?.unresolvedBackgroundErrors ?? 0;

  return (
    <PageLayout>
      <PageHeader title={dashboardMessages.overviewTitle} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
          href={(stats?.pendingSubmissions ?? 0) > 0 ? "/reports/suggestions" : undefined}
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
          href={(stats?.deadLinkReports ?? 0) > 0 ? "/reports/dead-links" : undefined}
        />
        <DashboardInfoCard
          label={dashboardMessages.cards.backgroundErrors}
          value={unresolvedBgErrors}
          accent={unresolvedBgErrors > 0}
          sub={unresolvedBgErrors > 0 ? dashboardMessages.cards.backgroundErrorsUnresolved : undefined}
          href={unresolvedBgErrors > 0 ? "/system/background-errors" : undefined}
        />
      </div>
    </PageLayout>
  );
}
