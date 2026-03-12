import { ArrowSquareUpRightIcon, CheckIcon, LinkIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { ShopDeleteReasonCard } from "@/features/content/shops/ShopDeleteReasonCard.tsx";
import {
  useDeadLinkReports,
  useDeleteShopFromDeadLinks,
  useDismissDeadLink,
} from "@/features/overview/hooks/useDeadLinks.ts";

export function DeadLinksTab() {
  const { locale, messages } = useI18n();
  const submissionsMessages = messages.submissions;
  const [deleteTarget, setDeleteTarget] = useState<{ shopId: number; shopName: string } | null>(
    null,
  );

  const { data: reports = [], isLoading } = useDeadLinkReports();
  const dismissMutation = useDismissDeadLink();
  const deleteMutation = useDeleteShopFromDeadLinks();
  const columns = useMemo<ColumnDef<(typeof reports)[number]>[]>(
    () => [
      {
        id: "shop",
        header: messages.shops.table.shop,
        sortKey: (report) => report.shopName.toLowerCase(),
        cell: (report) => (
          <div className="min-w-0">
            <p className="font-medium text-[var(--ds-text)] truncate">{report.shopName}</p>
            <a
              href={report.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline truncate"
            >
              {report.shopUrl}
              <ArrowSquareUpRightIcon weight="duotone" className="w-3 h-3 shrink-0" />
            </a>
          </div>
        ),
      },
      {
        id: "count",
        header: submissionsMessages.deadLinks.reportedSuffix,
        className: "w-44",
        sortKey: (report) => report.reportCount,
        cell: (report) => (
          <span className="inline-flex px-2.5 py-1 rounded-full bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)] text-xs font-semibold">
            {report.reportCount}
            {submissionsMessages.deadLinks.reportedSuffix}
          </span>
        ),
      },
      {
        id: "reportedAt",
        header: submissionsMessages.suggestions.submittedAt,
        className: "w-52",
        sortKey: (report) => (report.lastReportedAt ? new Date(report.lastReportedAt).getTime() : 0),
        cell: (report) =>
          report.lastReportedAt ? (
            <span className="text-xs text-[var(--ds-text-subtle)]">
              {new Date(report.lastReportedAt).toLocaleString(locale, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : (
            <span className="text-xs text-[var(--ds-text-subtle)]">–</span>
          ),
      },
      {
        id: "actions",
        className: "w-64",
        cell: (report) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dismissMutation.mutate(report.shopId)}
              disabled={dismissMutation.isPending || deleteMutation.isPending}
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] text-sm rounded-control hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors disabled:opacity-50"
            >
              <CheckIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.deadLinks.keep}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget({ shopId: report.shopId, shopName: report.shopName })}
              disabled={dismissMutation.isPending || deleteMutation.isPending}
              className="h-9 px-3 flex items-center gap-2 bg-[var(--ds-badge-danger-bg)] border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] text-sm rounded-control hover:bg-[var(--ds-btn-danger-hover-bg)] hover:border-[var(--ds-btn-danger-hover-border)] transition-colors disabled:opacity-50"
            >
              <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.deadLinks.delete}
            </button>
          </div>
        ),
      },
    ],
    [deleteMutation.isPending, dismissMutation.isPending, locale, messages.shops.table.shop, submissionsMessages],
  );

  if (isLoading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 4 }, (_, i) => `sk-${i}`).map((key) => (
          <div
            key={key}
            className="h-14 bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]"
          />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <ContentUnavailableView
        className="flex-1"
        icon={<LinkIcon weight="duotone" aria-hidden />}
        title={submissionsMessages.deadLinks.none}
        subtitle={submissionsMessages.deadLinks.noneHint}
      />
    );
  }

  return (
    <div className="-mx-3 -mt-3">
      <DataTable
        columns={columns}
        data={reports}
        getRowKey={(report) => report.shopId}
        stickyHeader
      />

      {deleteTarget !== null && (
        <ShopDeleteReasonCard
          shopName={deleteTarget.shopName}
          wasReported={true}
          isPending={deleteMutation.isPending}
          onConfirm={(reason, _wasReported, mode) => {
            deleteMutation.mutate(
              { shopId: deleteTarget.shopId, reason, mode },
              { onSuccess: () => setDeleteTarget(null) },
            );
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
