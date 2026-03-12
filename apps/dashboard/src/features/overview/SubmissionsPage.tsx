import {
  ClockIcon,
  PauseCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";

import { type SubmissionStatus } from "@lmaa/shared";

import { type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { FilterDropdown } from "@/components/ui/FilterDropdown.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { DeadLinksTab } from "@/features/overview/DeadLinksTab.tsx";
import { ShopReportsTab } from "@/features/overview/ShopReportsTab.tsx";
import { SuggestionsTab } from "@/features/overview/SuggestionsTab.tsx";
import { useAdminSubmissions } from "@/features/overview/hooks/useSubmissions.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

type Tab = "suggestions" | "dead-links" | "shop-reports";
type SuggestionsStatusFilter = Extract<SubmissionStatus, "pending" | "onhold" | "rejected">;
type ReportTabParam = Tab | undefined;

function resolveInitialTab(tabParam: ReportTabParam, search: string): Tab {
  if (tabParam === "dead-links" || tabParam === "shop-reports" || tabParam === "suggestions") {
    return tabParam;
  }

  const params = new URLSearchParams(search);
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
  const location = useLocation();
  const { tab: tabParam } = useParams<{ tab?: Tab }>();
  const { user } = useAuth();
  const submissionsMessages = messages.submissions;
  const tab = resolveInitialTab(tabParam, location.search);
  const [statusFilter, setStatusFilter] = useState<SuggestionsStatusFilter>("pending");
  const statusLabels = submissionsMessages.status;
  const { data: pendingSubmissions = [] } = useAdminSubmissions("pending");
  const { data: onholdSubmissions = [] } = useAdminSubmissions("onhold");
  const { data: rejectedSubmissions = [] } = useAdminSubmissions("rejected");

  const filterOptions = useMemo<DropdownOption<SuggestionsStatusFilter>[]>(
    () => [
      {
        value: "pending",
        label: statusLabels.pending,
        icon: <ClockIcon weight="duotone" className="w-3.5 h-3.5" />,
        count: pendingSubmissions.length,
      },
      {
        value: "onhold",
        label: statusLabels.onhold,
        icon: <PauseCircleIcon weight="duotone" className="w-3.5 h-3.5" />,
        count: onholdSubmissions.length,
      },
      {
        value: "rejected",
        label: statusLabels.rejected,
        icon: <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />,
        count: rejectedSubmissions.length,
      },
    ],
    [onholdSubmissions.length, pendingSubmissions.length, rejectedSubmissions.length, statusLabels],
  );
  return (
    <PageLayout>
      <PageHeader title={submissionsMessages.title}>
        {tab === "suggestions" && (
          <>
            <FilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={filterOptions}
              storageKey={getSegmentedStorageKey(user?.id, "submissions:suggestions:status")}
            />
          </>
        )}
      </PageHeader>

      {tab === "suggestions" && <SuggestionsTab filter={statusFilter} />}
      {tab === "dead-links" && <DeadLinksTab />}
      {tab === "shop-reports" && <ShopReportsTab />}
    </PageLayout>
  );
}
