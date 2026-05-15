import { TrashIcon } from "@phosphor-icons/react";

import type { MediaAsset } from "@lmaa/shared";

import { CancelActionButton, DeleteActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";

interface MediaDeleteDialogProps {
  common: ReturnType<typeof useI18n>["messages"]["common"];
  isDeleting: boolean;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onClose: () => void;
  onConfirm: () => void;
  targets: MediaAsset[] | null;
}

export function MediaDeleteDialog({
  common,
  isDeleting,
  mediaMessages,
  onClose,
  onConfirm,
  targets,
}: MediaDeleteDialogProps) {
  const targetCount = targets?.length ?? 0;

  return (
    <Dialog
      open={targets !== null}
      title={targetCount > 1 ? mediaMessages.deleteSelectedTitle : mediaMessages.deleteTitle}
      titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onClose}
    >
      <div className="px-6 py-3">
        <p className="text-sm text-[var(--ds-text-muted)]">
          {targetCount > 1 ? (
            mediaMessages.deleteSelectedDescription.replace("{count}", String(targetCount))
          ) : (
            <>
              <span className="font-medium">{targets?.[0]?.displayName}</span>{" "}
              {mediaMessages.deleteDescription}
            </>
          )}
        </p>
      </div>
      <Dialog.Footer>
        <CancelActionButton label={common.cancel} onClick={onClose} />
        <DeleteActionButton
          disabled={isDeleting || targetCount === 0}
          label={isDeleting ? "…" : common.delete}
          onClick={onConfirm}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
