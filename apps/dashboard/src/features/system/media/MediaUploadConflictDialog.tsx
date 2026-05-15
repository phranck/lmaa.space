import { FileIcon } from "@phosphor-icons/react";

import type { MediaAsset } from "@lmaa/shared";

import {
  CancelActionButton,
  OverwriteActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";

export interface UploadConflictState {
  draftName: string;
  existingAsset: MediaAsset;
  requestedName: string;
}

interface MediaUploadConflictDialogProps {
  canRename: boolean;
  common: ReturnType<typeof useI18n>["messages"]["common"];
  conflict: UploadConflictState | null;
  draftConflict: MediaAsset | null;
  draftName: string;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onCancel: () => void;
  onDraftNameChange: (name: string) => void;
  onOverwrite: () => void;
  onRename: () => void;
}

export function MediaUploadConflictDialog({
  canRename,
  common,
  conflict,
  draftConflict,
  draftName,
  mediaMessages,
  onCancel,
  onDraftNameChange,
  onOverwrite,
  onRename,
}: MediaUploadConflictDialogProps) {
  return (
    <Dialog
      maxWidth="md"
      open={conflict !== null}
      title={mediaMessages.uploadNameConflictTitle}
      titleIcon={<FileIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onCancel}
    >
      <div className="space-y-4 px-6 py-3">
        <p className="text-sm text-[var(--ds-text-muted)]">
          {mediaMessages.uploadNameConflictDescription.replace(
            "{name}",
            conflict?.existingAsset.displayName ?? "",
          )}
        </p>
        <DashboardInput
          error={draftConflict ? mediaMessages.uploadNameConflictNameTaken : undefined}
          label={mediaMessages.uploadNameConflictNameLabel}
          onChange={(event) => onDraftNameChange(event.currentTarget.value)}
          value={draftName}
        />
      </div>
      <Dialog.Footer className="grid grid-cols-3 gap-3">
        <CancelActionButton className="w-full" label={common.cancel} onClick={onCancel} />
        <DashboardButton
          className="w-full"
          disabled={!canRename}
          onClick={onRename}
          variant="primary"
        >
          {mediaMessages.uploadNameConflictRename}
        </DashboardButton>
        <OverwriteActionButton
          className="w-full"
          label={mediaMessages.uploadNameConflictOverwrite}
          onClick={onOverwrite}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
