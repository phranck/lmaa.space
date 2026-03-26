import { Suspense, lazy } from "react";

import { AnalyticsLoadingFallback } from "@/components/app/AnalyticsLoadingFallback.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

const AnalyticsSection = lazy(() =>
  import("./AnalyticsSection.tsx").then((m) => ({ default: m.AnalyticsSection })),
);

/**
 * Standalone analytics page.
 *
 * Route: `/analytics`
 */
export function AnalyticsPage() {
  const { messages } = useI18n();

  return (
    <PageLayout>
      <PageHeader title={messages.dashboard.analytics.title} />
      <Suspense fallback={<AnalyticsLoadingFallback />}>
        <AnalyticsSection />
      </Suspense>
    </PageLayout>
  );
}
