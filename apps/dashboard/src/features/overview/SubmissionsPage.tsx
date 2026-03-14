import {
  ClockIcon,
  DownloadSimpleIcon,
  PauseCircleIcon,
  UploadSimpleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router";

import { type SubmissionStatus } from "@lmaa/shared";

import { type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { FilterDropdown } from "@/components/ui/FilterDropdown.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { DeadLinksTab } from "@/features/overview/DeadLinksTab.tsx";
import {
  useAdminSubmissions,
  useExportSubmissions,
  useImportSubmissions,
} from "@/features/overview/hooks/useSubmissions.ts";
import { ShopReportsTab } from "@/features/overview/ShopReportsTab.tsx";
import { SuggestionsTab } from "@/features/overview/SuggestionsTab.tsx";
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
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportSubmissions = useExportSubmissions();
  const importMutation = useImportSubmissions();
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
            <button
              type="button"
              onClick={exportSubmissions}
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)] transition-colors"
            >
              <DownloadSimpleIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.suggestions.exportButton}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)] transition-colors disabled:opacity-50"
            >
              <UploadSimpleIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.suggestions.importButton}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const parsed = JSON.parse(reader.result as string);
                    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) {
                      setImportFeedback(submissionsMessages.suggestions.importInvalidFile);
                      return;
                    }
                    const entries = parsed.entries;
                    importMutation.mutate(entries, {
                      onSuccess: (result) => {
                        setImportFeedback(
                          submissionsMessages.suggestions.importSuccess
                            .replace("{imported}", String(result.imported))
                            .replace("{skipped}", String(result.skipped)),
                        );
                        setTimeout(() => setImportFeedback(null), 5000);
                      },
                      onError: () => {
                        setImportFeedback(submissionsMessages.suggestions.importError);
                        setTimeout(() => setImportFeedback(null), 5000);
                      },
                    });
                  } catch {
                    setImportFeedback(submissionsMessages.suggestions.importInvalidFile);
                    setTimeout(() => setImportFeedback(null), 5000);
                  }
                  e.target.value = "";
                };
                reader.readAsText(file);
              }}
            />
            {importFeedback && (
              <span className="text-xs text-[var(--ds-text-muted)]">{importFeedback}</span>
            )}
          </>
        )}
      </PageHeader>

      {tab === "suggestions" && <SuggestionsTab filter={statusFilter} />}
      {tab === "dead-links" && <DeadLinksTab />}
      {tab === "shop-reports" && <ShopReportsTab />}
    </PageLayout>
  );
}
