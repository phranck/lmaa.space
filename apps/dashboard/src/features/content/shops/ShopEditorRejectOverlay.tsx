import { DownloadIcon, FileTextIcon, XCircleIcon } from "@phosphor-icons/react";

import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { RejectDialog } from "@/components/ui/RejectDialog.tsx";

import type { ShopEditorController } from "./hooks/useShopEditorController.ts";
import { getEmptyRejectState } from "./shop-editor-utils.ts";

export function ShopEditorRejectOverlay({ controller }: { controller: ShopEditorController }) {
  const {
    activeShop,
    common,
    handleReject,
    isRejectError,
    isRejecting,
    rejectState,
    setRejectState,
    shopsMessages,
    suggestionsMsg,
  } = controller;

  return (
    <RejectDialog
      open={rejectState.open}
      onClose={() => setRejectState(getEmptyRejectState())}
      title={
        rejectState.editingRejection
          ? suggestionsMsg.reviewEditRejectionTitle
          : shopsMessages.editCard.rejectTitle
      }
      name={activeShop?.name ?? ""}
      url={activeShop?.url ?? ""}
      adminNote={rejectState.reason}
      onAdminNoteChange={(value) => setRejectState((current) => ({ ...current, reason: value }))}
      rejectionLongText={rejectState.longText}
      onRejectionLongTextChange={(value) =>
        setRejectState((current) => ({ ...current, longText: value }))
      }
      rejectionToken={rejectState.token}
      onSubmit={handleReject}
      isPending={isRejecting}
      isError={isRejectError}
      errorMessage={common.unknownError}
      submitLabel={rejectState.editingRejection ? common.save : shopsMessages.editCard.rejectSubmit}
      submitVariant={rejectState.editingRejection ? "primary" : "danger"}
      submitIcon={
        rejectState.editingRejection ? (
          <DownloadIcon weight="duotone" className="size-3.5" />
        ) : undefined
      }
      headerIcon={
        rejectState.editingRejection ? (
          <FileTextIcon weight="duotone" className={dialogHeaderIconClass} />
        ) : (
          <XCircleIcon weight="duotone" className={dialogHeaderIconClass} />
        )
      }
      storageKey="shops:reject-dialog-size"
      adminNoteStorageKey="shops:textarea:reject-note"
      rejectionLongStorageKey="shops:textarea:reject-long"
      messages={{
        cancel: common.cancel,
        comment: suggestionsMsg.comment,
        copyUrl: common.copyUrl,
        optional: suggestionsMsg.optional,
        commentPlaceholder: suggestionsMsg.rejectReasonPlaceholder,
        rejectionLongLabel: suggestionsMsg.rejectionLongLabel,
        rejectionLongPlaceholder: suggestionsMsg.rejectionLongPlaceholder,
        errorPrefix: suggestionsMsg.reviewErrorPrefix,
      }}
    />
  );
}
