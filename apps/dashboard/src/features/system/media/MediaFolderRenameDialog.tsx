import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import type { MediaFolder } from "@lmaa/shared";

import { CancelActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface MediaFolderRenameDialogProps {
  open: boolean;
  folder: MediaFolder | null;
  onCancel: () => void;
  onSubmit: (folderId: number, name: string) => Promise<void> | void;
  busy?: boolean;
  errorMessage?: string | null;
}

export function MediaFolderRenameDialog({
  open,
  folder,
  onCancel,
  onSubmit,
  busy = false,
  errorMessage,
}: MediaFolderRenameDialogProps) {
  const { messages } = useI18n();
  const t = messages.media.folders;
  const common = messages.common;

  if (!open || !folder) return null;

  return (
    <MediaFolderRenameDialogContent
      key={folder.id}
      folder={folder}
      title={t.renameFolderTitle}
      folderNameLabel={t.folderNameLabel}
      cancelLabel={common.cancel}
      saveLabel={common.save}
      onCancel={onCancel}
      onSubmit={onSubmit}
      busy={busy}
      errorMessage={errorMessage}
    />
  );
}

function MediaFolderRenameDialogContent({
  folder,
  title,
  folderNameLabel,
  cancelLabel,
  saveLabel,
  onCancel,
  onSubmit,
  busy,
  errorMessage,
}: {
  folder: MediaFolder;
  title: string;
  folderNameLabel: string;
  cancelLabel: string;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: (folderId: number, name: string) => Promise<void> | void;
  busy: boolean;
  errorMessage?: string | null;
}) {
  const [draft, setDraft] = useState<{ folderId: number | null; name: string }>({
    folderId: folder.id,
    name: folder.name,
  });
  const name = draft.folderId === folder.id ? draft.name : folder.name;
  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== folder.name && !busy;

  return (
    <Dialog
      open
      title={title}
      titleIcon={<PencilSimpleIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={busy ? () => undefined : onCancel}
    >
      <div className="px-6 py-3">
        <DashboardInput
          id="media-folder-rename-name"
          type="text"
          label={folderNameLabel}
          value={name}
          onChange={(event) => setDraft({ folderId: folder.id, name: event.target.value })}
          error={errorMessage ?? undefined}
          autoFocus
        />
      </div>
      <Dialog.Footer>
        <CancelActionButton onClick={onCancel} disabled={busy} label={cancelLabel} />
        <SaveActionButton
          onClick={() => void onSubmit(folder.id, trimmed)}
          disabled={!canSubmit}
          busy={busy}
          label={saveLabel}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
