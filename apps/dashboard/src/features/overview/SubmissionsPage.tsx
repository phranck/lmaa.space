import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { DeadLinksTab } from "@/features/overview/DeadLinksTab.tsx";
import { ShopReportsTab } from "@/features/overview/ShopReportsTab.tsx";
import { SuggestionsTab } from "@/features/overview/SuggestionsTab.tsx";
import { useDeadLinkReports } from "@/features/overview/hooks/useDeadLinks.ts";
import { useShopConcernReports } from "@/features/overview/hooks/useShopConcerns.ts";
import { useAdminSubmissions } from "@/features/overview/hooks/useSubmissions.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";
import { useState } from "react";

type Tab = "suggestions" | "dead-links" | "shop-reports";

function getInitialTab(): Tab {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab");
  if (t === "dead-links" || t === "shop-reports") return t;
  return "suggestions";
}

/**
 * Submissions hub with tabs for suggestions, dead links and concern reports.
 *
 * @returns Submissions route component.
 */
export function SubmissionsPage() {
  const { messages } = useI18n();
  const { user } = useAuth();
  const submissionsMessages = messages.submissions;
  const [tab, setTab] = useState<Tab>(getInitialTab);

  const { data: pendingSubmissions = [] } = useAdminSubmissions("pending");
  const { data: deadLinkReports = [] } = useDeadLinkReports();
  const { data: shopConcerns = [] } = useShopConcernReports();

  const pendingCount = pendingSubmissions.length;
  const deadLinkCount = deadLinkReports.length;
  const concernCount = shopConcerns.length;

  return (
    <div className="flex flex-col flex-1">
      <PageHeader title={submissionsMessages.title}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          storageKey={getSegmentedStorageKey(user?.id, "submissions:tab")}
          options={[
            {
              value: "suggestions" as const,
              label: submissionsMessages.tabs.suggestions,
              badge:
                pendingCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-badge-pending-bg)] text-[var(--ds-badge-pending-text)]">
                    {pendingCount}
                  </span>
                ) : undefined,
            },
            {
              value: "dead-links" as const,
              label: submissionsMessages.tabs.deadLinks,
              badge:
                deadLinkCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]">
                    {deadLinkCount}
                  </span>
                ) : undefined,
            },
            {
              value: "shop-reports" as const,
              label: submissionsMessages.tabs.shopReports,
              badge:
                concernCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]">
                    {concernCount}
                  </span>
                ) : undefined,
            },
          ]}
        />
      </PageHeader>

      {tab === "suggestions" && <SuggestionsTab />}
      {tab === "dead-links" && <DeadLinksTab />}
      {tab === "shop-reports" && <ShopReportsTab />}
    </div>
  );
}
