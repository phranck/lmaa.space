import { type ClipboardEvent, useState } from "react";
import SFArrowCounterclockwise from "sf-symbols-lib/monochrome/SFArrowCounterclockwise";
import SFLongTextPageAndPencilFill from "sf-symbols-lib/monochrome/SFLongTextPageAndPencilFill";
import SFStorefrontFill from "sf-symbols-lib/monochrome/SFStorefrontFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";
import SFXmarkCircleFill from "sf-symbols-lib/monochrome/SFXmarkCircleFill";

import { generateRejectionToken } from "@lmaa/shared";

import { ItemCard } from "@/components/ui/Card.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { RejectDialog } from "@/components/ui/RejectDialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useDeleteShop,
  useSetShopVisibility,
} from "@/features/content/hooks/useAdminShops.ts";
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

  function handleRejectPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData("text");
    if (!pastedText.includes("[REJECT_TOKEN]")) return;
    event.preventDefault();
    const token = rejectToken ?? "";
    const replaced = pastedText.replace(/\[REJECT_TOKEN\]/g, token);
    const textarea = event.currentTarget;
    const newValue =
      rejectReason.slice(0, textarea.selectionStart) +
      replaced +
      rejectReason.slice(textarea.selectionEnd);
    setRejectReason(newValue);
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
      <div className="p-3 text-center text-[var(--ds-text-subtle)] text-sm">
        {submissionsMessages.shopReports.loading}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <ContentUnavailableView
        className="flex-1"
        icon={<SFStorefrontFill aria-hidden />}
        title={submissionsMessages.shopReports.none}
        subtitle={submissionsMessages.shopReports.noneHint}
      />
    );
  }

  return (
    <>
      <div className="p-3 space-y-3">
        {reports.map((r) => (
          <ItemCard key={r.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm text-[var(--ds-text)] truncate">{r.shopName}</p>
                <a
                  href={r.shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--ds-text-muted)] hover:underline truncate block"
                >
                  {r.shopUrl}
                </a>
              </div>
              <span className="shrink-0 text-xs text-[var(--ds-text-muted)]">
                {new Date(r.reportedAt).toLocaleString(locale, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <p className="text-sm text-[var(--ds-text)] bg-[var(--ds-surface-hover)] rounded-lg px-3 py-2 whitespace-pre-wrap">
              {r.reason}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => dismiss.mutate(r.id)}
                disabled={dismiss.isPending || setVisibilityMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors disabled:opacity-50"
              >
                <SFArrowCounterclockwise className="w-3 h-3" />
                {submissionsMessages.shopReports.done}
              </button>
              <button
                type="button"
                onClick={() =>
                  openRejectDialog({
                    reportId: r.id,
                    shopId: r.shopId,
                    shopName: r.shopName,
                    shopUrl: r.shopUrl,
                  })
                }
                disabled={dismiss.isPending || setVisibilityMutation.isPending}
                className="h-7 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors disabled:opacity-50"
              >
                <SFXmarkCircleFill className="w-3.5 h-3.5" />
                {submissionsMessages.shopReports.reject}
              </button>
              <button
                type="button"
                onClick={() => setEditShopId(r.shopId)}
                className="h-7 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
              >
                <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                {submissionsMessages.shopReports.edit}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget({ reportId: r.id, shopId: r.shopId, shopName: r.shopName })
                }
                className="h-7 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
              >
                <SFTrashFill className="w-3.5 h-3.5" />
                {submissionsMessages.shopReports.delete}
              </button>
            </div>
          </ItemCard>
        ))}
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
        onAdminNotePaste={handleRejectPaste}
        rejectionLongText={rejectLongText}
        onRejectionLongTextChange={setRejectLongText}
        onSubmit={handleRejectShop}
        isPending={setVisibilityMutation.isPending}
        isError={setVisibilityMutation.isError}
        errorMessage={common.unknownError}
        submitLabel={shopsMessages.editCard.rejectSubmit}
        headerIcon={<SFXmarkCircleFill className={dialogHeaderIconClass} />}
        storageKey="shop-reports:reject-dialog-size"
        adminNoteStorageKey="shop-reports:textarea:reject-note"
        rejectionLongStorageKey="shop-reports:textarea:reject-long"
        messages={{
          cancel: common.cancel,
          comment: suggestionsMessages.comment,
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
