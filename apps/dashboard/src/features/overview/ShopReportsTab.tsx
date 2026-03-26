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
import { SkeletonRows } from "@/components/ui/SkeletonRows.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useDeleteShop, useSetShopVisibility } from "@/features/content/shops/hooks/useAdminShops.ts";
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
          <p className="text-sm text-[var(--ds-text)] whitespace-pre-wrap break-words">
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
            <TableActionButton
              onClick={() => dismiss.mutate(report.id)}
              disabled={dismiss.isPending || setVisibilityMutation.isPending}
              icon={<ArrowCounterClockwiseIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={submissionsMessages.shopReports.done}
            />
            <TableActionButton
              onClick={() => setEditShopId(report.shopId)}
              icon={<FileTextIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={submissionsMessages.shopReports.edit}
            />
            <TableActionButton
              variant="danger"
              onClick={() =>
                openRejectDialog({
                  reportId: report.id,
                  shopId: report.shopId,
                  shopName: report.shopName,
                  shopUrl: report.shopUrl,
                })
              }
              disabled={dismiss.isPending || setVisibilityMutation.isPending}
              icon={<XCircleIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={submissionsMessages.shopReports.reject}
            />
            <TableActionButton
              variant="danger"
              onClick={() =>
                setDeleteTarget({
                  reportId: report.id,
                  shopId: report.shopId,
                  shopName: report.shopName,
                })
              }
              icon={<TrashIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={submissionsMessages.shopReports.delete}
            />
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
        <SkeletonRows />
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
