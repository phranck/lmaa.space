import {
  ArrowCounterClockwiseIcon,
  FileTextIcon,
  StorefrontIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { generateRejectionToken } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { RejectDialog } from "@/components/ui/RejectDialog.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useDeleteShop, useSetShopVisibility } from "@/features/content/hooks/useAdminShops.ts";
import { ShopDeleteReasonCard } from "@/features/content/shops/ShopDeleteReasonCard.tsx";
import { ShopEditCard } from "@/features/content/shops/ShopEditCard.tsx";
import {
  useDismissShopConcern,
  useShopConcernReports,
} from "@/features/overview/hooks/useShopConcerns.ts";

type RejectTarget = {
  reportId: number;
  shopId: number;
  shopName: string;
  shopUrl: string;
};

export function ShopReportsTab() {
  const { locale, messages } = useI18n();
  const common = messages.common;
  const submissionsMessages = messages.submissions;
  const suggestionsMessages = submissionsMessages.suggestions;
  const shopsMessages = messages.shops;
  const { data: reports = [], isLoading } = useShopConcernReports();
  const dismiss = useDismissShopConcern();
  const deleteMutation = useDeleteShop();
  const setVisibilityMutation = useSetShopVisibility();
  const [editShopId, setEditShopId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    reportId: number;
    shopId: number;
    shopName: string;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLongText, setRejectLongText] = useState("");
  const [rejectToken, setRejectToken] = useState<string | null>(null);
  const columns = useMemo<ColumnDef<(typeof reports)[number]>[]>(
    () => [
      {
        id: "shop",
        header: shopsMessages.table.shop,
        sortKey: (report) => report.shopName.toLowerCase(),
        cell: (report) => (
          <div className="min-w-0">
            <p className="font-medium text-[var(--ds-text)] truncate">{report.shopName}</p>
            <a
              href={report.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-primary)] hover:underline truncate block"
            >
              {report.shopUrl}
            </a>
          </div>
        ),
      },
      {
        id: "reason",
        header: suggestionsMessages.comment,
        className: "max-w-[34rem]",
        cell: (report) => (
          <p className="text-sm text-[var(--ds-text)] line-clamp-2 whitespace-pre-wrap break-all">
            {report.reason}
          </p>
        ),
      },
      {
        id: "reportedAt",
        header: submissionsMessages.suggestions.submittedAt,
        className: "w-52",
        sortKey: (report) => new Date(report.reportedAt).getTime(),
        cell: (report) => (
          <span className="text-xs text-[var(--ds-text-subtle)]">
            {new Date(report.reportedAt).toLocaleString(locale, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        className: "w-[28rem]",
        cell: (report) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => dismiss.mutate(report.id)}
              disabled={dismiss.isPending || setVisibilityMutation.isPending}
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors disabled:opacity-50"
            >
              <ArrowCounterClockwiseIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.shopReports.done}
            </button>
            <button
              type="button"
              onClick={() => setEditShopId(report.shopId)}
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
            >
              <FileTextIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.shopReports.edit}
            </button>
            <button
              type="button"
              onClick={() =>
                openRejectDialog({
                  reportId: report.id,
                  shopId: report.shopId,
                  shopName: report.shopName,
                  shopUrl: report.shopUrl,
                })
              }
              disabled={dismiss.isPending || setVisibilityMutation.isPending}
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors disabled:opacity-50"
            >
              <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.shopReports.reject}
            </button>
            <button
              type="button"
              onClick={() =>
                setDeleteTarget({
                  reportId: report.id,
                  shopId: report.shopId,
                  shopName: report.shopName,
                })
              }
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
            >
              <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
              {submissionsMessages.shopReports.delete}
            </button>
          </div>
        ),
      },
    ],
    [
      dismiss,
      locale,
      setVisibilityMutation.isPending,
      shopsMessages.table.shop,
      submissionsMessages.shopReports,
      submissionsMessages.suggestions.submittedAt,
      suggestionsMessages.comment,
    ],
  );

  function openRejectDialog(report: RejectTarget) {
    setRejectTarget(report);
    setRejectReason("");
    setRejectLongText("");
    setRejectToken(generateRejectionToken());
  }

  function closeRejectDialog() {
    setRejectTarget(null);
    setRejectReason("");
    setRejectLongText("");
    setRejectToken(null);
  }

  function handleRejectShop() {
    if (!rejectTarget) return;

    setVisibilityMutation.mutate(
      {
        id: rejectTarget.shopId,
        visibility: "rejected",
        rejectionToken: rejectToken ?? undefined,
        rejectionLongText: rejectLongText || null,
      },
      {
        onSuccess: () => {
          dismiss.mutate(rejectTarget.reportId);
          closeRejectDialog();
        },
      },
    );
  }

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
        icon={<StorefrontIcon weight="duotone" aria-hidden />}
        title={submissionsMessages.shopReports.none}
        subtitle={submissionsMessages.shopReports.noneHint}
      />
    );
  }

  return (
    <>
      <div className="-mx-3 -mt-3">
        <DataTable columns={columns} data={reports} getRowKey={(report) => report.id} stickyHeader />
      </div>

      {editShopId !== null && (
        <ShopEditCard
          shopId={editShopId}
          onClose={() => setEditShopId(null)}
          onSaved={() => setEditShopId(null)}
        />
      )}

      {deleteTarget !== null && (
        <ShopDeleteReasonCard
          shopName={deleteTarget.shopName}
          wasReported={true}
          isPending={deleteMutation.isPending}
          onConfirm={(reason, wasReported, mode) => {
            deleteMutation.mutate(
              { id: deleteTarget.shopId, reason, wasReported, mode },
              {
                onSuccess: () => {
                  dismiss.mutate(deleteTarget.reportId);
                  setDeleteTarget(null);
                },
              },
            );
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <RejectDialog
        open={rejectTarget !== null}
        onClose={closeRejectDialog}
        title={shopsMessages.editCard.rejectTitle}
        name={rejectTarget?.shopName ?? ""}
        url={rejectTarget?.shopUrl ?? ""}
        adminNote={rejectReason}
        onAdminNoteChange={setRejectReason}
        rejectionLongText={rejectLongText}
        onRejectionLongTextChange={setRejectLongText}
        rejectionToken={rejectToken}
        onSubmit={handleRejectShop}
        isPending={setVisibilityMutation.isPending}
        isError={setVisibilityMutation.isError}
        errorMessage={common.unknownError}
        submitLabel={shopsMessages.editCard.rejectSubmit}
        headerIcon={<XCircleIcon weight="duotone" className={dialogHeaderIconClass} />}
        storageKey="shop-reports:reject-dialog-size"
        adminNoteStorageKey="shop-reports:textarea:reject-note"
        rejectionLongStorageKey="shop-reports:textarea:reject-long"
        messages={{
          cancel: common.cancel,
          comment: suggestionsMessages.comment,
          copyUrl: common.copyUrl,
          optional: suggestionsMessages.optional,
          commentPlaceholder: suggestionsMessages.rejectReasonPlaceholder,
          rejectionLongLabel: suggestionsMessages.rejectionLongLabel,
          rejectionLongPlaceholder: suggestionsMessages.rejectionLongPlaceholder,
          errorPrefix: suggestionsMessages.reviewErrorPrefix,
        }}
      />
    </>
  );
}
