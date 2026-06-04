import { TrashIcon } from "@phosphor-icons/react";

import type { MediaFolder } from "@lmaa/shared";

import { CancelActionButton, DeleteActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface MediaFolderDeleteDialogProps {
  target: { folder: MediaFolder; itemCount: number } | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (folderId: number) => Promise<void> | void;
}

export function MediaFolderDeleteDialog({
  target,
  busy = false,
  onClose,
  onConfirm,
}: MediaFolderDeleteDialogProps) {
  const { messages } = useI18n();
  const t = messages.media.folders;
  const common = messages.common;

  if (!target) return null;

  return (
    <Dialog
      open
      title={t.deleteFolderTitle}
      titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={busy ? () => undefined : onClose}
    >
      <div className="space-y-3 px-6 py-3 text-sm text-[var(--ds-text)]">
        <p className="font-medium">{target.folder.name}</p>
        <p className="text-[var(--ds-text-muted)]">{t.deleteFolderConfirm(target.itemCount)}</p>
      </div>
      <Dialog.Footer>
        <CancelActionButton onClick={onClose} disabled={busy} label={common.cancel} />
        <DeleteActionButton
          onClick={() => void onConfirm(target.folder.id)}
          disabled={busy}
          busy={busy}
          label={common.delete}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
