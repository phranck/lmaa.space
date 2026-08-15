import { ArrowSquareUpRightIcon, CheckIcon, LinkIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { SkeletonRows } from "@/components/ui/SkeletonRows.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
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
          <Badge colorClass="bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]">
            {report.reportCount}
            {submissionsMessages.deadLinks.reportedSuffix}
          </Badge>
        ),
      },
      {
        id: "reportedAt",
        header: submissionsMessages.suggestions.submittedAt,
        className: "w-52",
        sortKey: (report) =>
          report.lastReportedAt ? new Date(report.lastReportedAt).getTime() : 0,
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
            <TableActionButton
              onClick={() => dismissMutation.mutate(report.shopId)}
              disabled={dismissMutation.isPending || deleteMutation.isPending}
              icon={<CheckIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={submissionsMessages.deadLinks.keep}
            />
            <TableActionButton
              variant="danger"
              onClick={() => setDeleteTarget({ shopId: report.shopId, shopName: report.shopName })}
              disabled={dismissMutation.isPending || deleteMutation.isPending}
              icon={<TrashIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={submissionsMessages.deadLinks.delete}
            />
          </div>
        ),
      },
    ],
    [
      deleteMutation.isPending,
      dismissMutation.isPending,
      dismissMutation.mutate,
      locale,
      messages.shops.table.shop,
      submissionsMessages,
    ],
  );

  if (isLoading) {
    return (
      <div className="space-y-px">
        <SkeletonRows />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <ContentUnavailableView
        chromeless
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
