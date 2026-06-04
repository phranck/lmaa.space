import { FolderPlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { ApproveActionButton, CancelActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface MediaFolderCreateDialogProps {
  open: boolean;
  selectedAssetCount: number;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void> | void;
  busy?: boolean;
  errorMessage?: string | null;
}

export function MediaFolderCreateDialog({
  open,
  selectedAssetCount,
  onCancel,
  onSubmit,
  busy = false,
  errorMessage,
}: MediaFolderCreateDialogProps) {
  const { messages } = useI18n();
  const t = messages.media.folders;
  const common = messages.common;

  if (!open) return null;

  const title =
    selectedAssetCount > 0 ? t.newFolderWithSelectionTitle(selectedAssetCount) : t.newFolderTitle;

  return (
    <MediaFolderCreateDialogContent
      key={selectedAssetCount}
      title={title}
      folderNameLabel={t.folderNameLabel}
      folderNamePlaceholder={t.folderNamePlaceholder}
      cancelLabel={common.cancel}
      createLabel={common.create}
      onCancel={onCancel}
      onSubmit={onSubmit}
      busy={busy}
      errorMessage={errorMessage}
    />
  );
}

function MediaFolderCreateDialogContent({
  title,
  folderNameLabel,
  folderNamePlaceholder,
  cancelLabel,
  createLabel,
  onCancel,
  onSubmit,
  busy,
  errorMessage,
}: {
  title: string;
  folderNameLabel: string;
  folderNamePlaceholder: string;
  cancelLabel: string;
  createLabel: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void> | void;
  busy: boolean;
  errorMessage?: string | null;
}) {
  const [name, setName] = useState("");
  const canSubmit = name.trim().length > 0 && !busy;

  return (
    <Dialog
      open
      title={title}
      titleIcon={<FolderPlusIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={busy ? () => undefined : onCancel}
    >
      <div className="px-6 py-3">
        <DashboardInput
          id="media-folder-create-name"
          type="text"
          label={folderNameLabel}
          placeholder={folderNamePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errorMessage ?? undefined}
          autoFocus
        />
      </div>
      <Dialog.Footer>
        <CancelActionButton onClick={onCancel} disabled={busy} label={cancelLabel} />
        <ApproveActionButton
          onClick={() => void onSubmit(name.trim())}
          disabled={!canSubmit}
          busy={busy}
          label={createLabel}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
