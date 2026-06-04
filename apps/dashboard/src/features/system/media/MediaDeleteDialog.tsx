import { TrashIcon } from "@phosphor-icons/react";

import type { MediaAsset, MediaFolder } from "@lmaa/shared";
import { FormHelpText } from "@lmaa/ui/form-primitives";

import { CancelActionButton, DeleteActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";

interface MediaDeleteDialogProps {
  common: ReturnType<typeof useI18n>["messages"]["common"];
  isDeleting: boolean;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onClose: () => void;
  onConfirm: () => void;
  targets: { assets: MediaAsset[]; folders: MediaFolder[] } | null;
}

export function MediaDeleteDialog({
  common,
  isDeleting,
  mediaMessages,
  onClose,
  onConfirm,
  targets,
}: MediaDeleteDialogProps) {
  if (targets === null) return null;

  const { assets, folders } = targets;
  const totalCount = assets.length + folders.length;
  const isSingleAsset = assets.length === 1 && folders.length === 0;
  const hasFolders = folders.length > 0;
  const title = isSingleAsset ? mediaMessages.deleteTitle : mediaMessages.deleteSelectedTitle;

  return (
    <Dialog
      open
      title={title}
      titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onClose}
    >
      <div className="px-6 py-3">
        <FormHelpText className="!text-base !font-light !text-white">
          {isSingleAsset ? (
            <>
              <span className="font-medium">{assets[0]?.displayName}</span>{" "}
              {mediaMessages.deleteDescription}
            </>
          ) : hasFolders ? (
            mediaMessages.folders.deleteFolderConfirm(totalCount)
          ) : (
            mediaMessages.deleteSelectedDescription.replace("{count}", String(totalCount))
          )}
        </FormHelpText>
      </div>
      <Dialog.Footer>
        <CancelActionButton label={common.cancel} onClick={onClose} />
        <DeleteActionButton
          disabled={isDeleting || totalCount === 0}
          label={isDeleting ? "…" : common.delete}
          onClick={onConfirm}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
