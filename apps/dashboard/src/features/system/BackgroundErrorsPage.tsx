import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  DashboardCombobox,
  DashboardInput,
} from "@/components/ui/DashboardControls.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { DataTable, type ColumnDef } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  type BackgroundErrorRow,
  useBackgroundErrors,
  useResolveBackgroundError,
} from "@/features/system/hooks/useBackgroundErrors.ts";

export function BackgroundErrorsPage() {
  const { messages, locale } = useI18n();
  const t = messages.system.backgroundErrors;

  const [sourceFilter, setSourceFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState<"all" | "unresolved" | "resolved">("all");

  const resolved =
    resolvedFilter === "all" ? undefined : resolvedFilter === "resolved" ? true : false;

  const { data: rows = [], isLoading } = useBackgroundErrors({
    resolved,
    source: sourceFilter.trim() || undefined,
  });

  const resolve = useResolveBackgroundError();

  const columns: ColumnDef<BackgroundErrorRow>[] = [
    {
      id: "source",
      header: t.columnSource,
      cell: (row) => (
        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--ds-surface-hover)] text-[var(--ds-text)]">
          {row.source}
        </span>
      ),
      sortKey: (row) => row.source,
    },
    {
      id: "message",
      header: t.columnMessage,
      cell: (row) => (
        <span className="text-sm text-[var(--ds-text)] line-clamp-2 break-words">{row.message}</span>
      ),
    },
    {
      id: "occurredAt",
      header: t.columnOccurredAt,
      cell: (row) => (
        <span
          className="text-sm text-[var(--ds-text-muted)] whitespace-nowrap"
          suppressHydrationWarning
        >
          {new Date(row.occurredAt).toLocaleString(locale)}
        </span>
      ),
      sortKey: (row) => row.occurredAt,
    },
    {
      id: "status",
      header: t.columnStatus,
      cell: (row) =>
        row.resolvedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-text-success,var(--ds-text-muted))]">
            <CheckCircleIcon weight="duotone" className="size-3.5" />
            {t.statusResolved}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-500">
            <WarningCircleIcon weight="duotone" className="size-3.5" />
            {t.statusOpen}
          </span>
        ),
      sortKey: (row) => (row.resolvedAt ? 1 : 0),
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        row.resolvedAt ? null : (
          <div className="flex justify-end">
            <TableActionButton
              variant="success"
              icon={<CheckCircleIcon weight="duotone" className="size-3.5" />}
              label={t.resolveAction}
              disabled={resolve.isPending}
              onClick={() => resolve.mutate(row.id)}
            />
          </div>
        ),
      cellClassName: "w-32",
    },
  ];

  return (
    <PageLayout>
      <PageHeader title={t.title} />
      <PageBody className="p-4 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <DashboardInput
            type="text"
            placeholder={t.filterSourcePlaceholder}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          />
          <DashboardCombobox
            value={resolvedFilter}
            onValueChange={(value) =>
              setResolvedFilter(value as typeof resolvedFilter)
            }
            className="w-40"
            options={[
              { value: "all", label: t.filterAll },
              { value: "unresolved", label: t.filterUnresolved },
              { value: "resolved", label: t.filterResolved },
            ]}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--ds-text-muted)]">{messages.common.loading}</p>
        ) : rows.length === 0 ? (
          <ContentUnavailableView
            icon={<CheckCircleIcon weight="duotone" className="size-8" />}
            title={t.noErrors}
            subtitle={t.noErrorsSubtitle}
          />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            getRowKey={(row) => row.id}
            initialSort={{ id: "occurredAt", dir: "desc" }}
          />
        )}
      </PageBody>
    </PageLayout>
  );
}
