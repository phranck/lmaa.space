import {
  ClockIcon,
  PauseCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router";

import { type SubmissionStatus } from "@lmaa/shared";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import { type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { ExportButton } from "@/components/ui/ExportButton.tsx";
import { FilterDropdown } from "@/components/ui/FilterDropdown.tsx";
import { ImportButton } from "@/components/ui/ImportButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { type SortState } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { DeadLinksTab } from "@/features/overview/DeadLinksTab.tsx";
import {
  useAdminSubmissions,
  useImportSubmissions,
} from "@/features/overview/hooks/useSubmissions.ts";
import { ShopReportsTab } from "@/features/overview/ShopReportsTab.tsx";
import { SuggestionsTab } from "@/features/overview/SuggestionsTab.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

type Tab = "suggestions" | "dead-links" | "shop-reports";
type SuggestionsStatusFilter = Extract<SubmissionStatus, "pending" | "onhold" | "rejected">;
type ReportTabParam = Tab | undefined;
const SUGGESTIONS_SORTABLE_COLUMNS = new Set(["shop", "submitted", "rejectedAt"]);

function resolveInitialTab(tabParam: ReportTabParam, search: string): Tab {
  if (tabParam === "dead-links" || tabParam === "shop-reports" || tabParam === "suggestions") {
    return tabParam;
  }

  const params = new URLSearchParams(search);
  const t = params.get("tab");
  if (t === "dead-links" || t === "shop-reports") return t;
  return "suggestions";
}

function parseSuggestionsSort(searchParams: URLSearchParams): SortState {
  const id = searchParams.get("sort");
  const dir = searchParams.get("dir");
  if (id && dir && SUGGESTIONS_SORTABLE_COLUMNS.has(id) && (dir === "asc" || dir === "desc")) {
    return { id, dir };
  }
  return { id: "shop", dir: "asc" };
}

/**
 * Submissions hub with tabs for suggestions, dead links and concern reports.
 *
 * @returns Submissions route component.
 */
export function SubmissionsPage() {
  const { messages } = useI18n();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab: tabParam } = useParams<{ tab?: Tab }>();
  const { user } = useAuth();
  const submissionsMessages = messages.submissions;
  const tab = resolveInitialTab(tabParam, location.search);
  const [statusFilter, setStatusFilter] = useState<SuggestionsStatusFilter>("pending");
  const [importError, setImportError] = useState<string | null>(null);
  const importMutation = useImportSubmissions();
  const statusLabels = submissionsMessages.status;
  const suggestionsSort = useMemo(() => parseSuggestionsSort(searchParams), [searchParams]);
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

  function handleExport() {
    const rows = pendingSubmissions.map((s) => ({ submissionId: s.id, shopUrl: s.shopUrl }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as unknown;
        if (!Array.isArray(parsed)) {
          setImportError(submissionsMessages.suggestions.importInvalidFile);
          return;
        }
        const entries = parsed as Array<Record<string, unknown>>;
        importMutation.mutate(entries, {
          onError: () => setImportError(submissionsMessages.suggestions.importError),
        });
      } catch {
        setImportError(submissionsMessages.suggestions.importInvalidFile);
      }
    };
    reader.readAsText(file);
  }

  function handleSuggestionsSortChange(nextSort: SortState | null) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextSort) {
      nextParams.set("sort", nextSort.id);
      nextParams.set("dir", nextSort.dir);
    } else {
      nextParams.delete("sort");
      nextParams.delete("dir");
    }
    setSearchParams(nextParams, { replace: true });
  }

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
            <ImportButton
              onFileSelected={handleImportFile}
              disabled={importMutation.isPending}
              tooltip={submissionsMessages.suggestions.importTooltip}
              label={submissionsMessages.suggestions.importLabel}
            />
            <ExportButton
              onClick={handleExport}
              disabled={pendingSubmissions.length === 0}
              tooltip={submissionsMessages.suggestions.exportTooltip}
              label={submissionsMessages.suggestions.exportLabel}
            />
          </>
        )}
      </PageHeader>

      <AlertDialog
        open={importError !== null}
        title={submissionsMessages.suggestions.importError}
        variant="error"
        onClose={() => setImportError(null)}
      >
        {importError}
      </AlertDialog>

      {tab === "suggestions" && (
        <SuggestionsTab
          filter={statusFilter}
          sort={suggestionsSort}
          onSortChange={handleSuggestionsSortChange}
        />
      )}
      {tab === "dead-links" && <DeadLinksTab />}
      {tab === "shop-reports" && <ShopReportsTab />}
    </PageLayout>
  );
}
