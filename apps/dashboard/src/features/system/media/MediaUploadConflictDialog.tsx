import { FileIcon } from "@phosphor-icons/react";

import type { MediaAsset } from "@lmaa/shared";
import { FormHelpText } from "@lmaa/ui/form-primitives";

import {
  CancelActionButton,
  EditActionButton,
  OverwriteActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardCheckboxField, DashboardInput } from "@/components/ui/DashboardControls.tsx";
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
  applyToAll: boolean;
  draftConflict: MediaAsset | null;
  draftName: string;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onCancel: () => void;
  onApplyToAllChange: (checked: boolean) => void;
  onDraftNameChange: (name: string) => void;
  onOverwrite: () => void;
  onRename: () => void;
  showApplyToAll: boolean;
}

export function MediaUploadConflictDialog({
  applyToAll,
  canRename,
  common,
  conflict,
  draftConflict,
  draftName,
  mediaMessages,
  onApplyToAllChange,
  onCancel,
  onDraftNameChange,
  onOverwrite,
  onRename,
  showApplyToAll,
}: MediaUploadConflictDialogProps) {
  return (
    <Dialog
      open={conflict !== null}
      title={mediaMessages.uploadNameConflictTitle}
      titleIcon={<FileIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onCancel}
    >
      <div className="space-y-4 px-6 py-3">
        <FormHelpText className="!text-base !font-light !text-white">
          {mediaMessages.uploadNameConflictDescription.replace(
            "{name}",
            conflict?.existingAsset.displayName ?? "",
          )}
        </FormHelpText>
        <DashboardInput
          error={draftConflict ? mediaMessages.uploadNameConflictNameTaken : undefined}
          label={mediaMessages.uploadNameConflictNameLabel}
          onChange={(event) => onDraftNameChange(event.currentTarget.value)}
          value={draftName}
        />
        {showApplyToAll && (
          <DashboardCheckboxField
            checked={applyToAll}
            label={mediaMessages.uploadNameConflictApplyToAll}
            onCheckedChange={onApplyToAllChange}
          />
        )}
      </div>
      <Dialog.Footer>
        <CancelActionButton label={common.cancel} onClick={onCancel} />
        <EditActionButton
          disabled={!canRename}
          label={mediaMessages.uploadNameConflictRename}
          onClick={onRename}
          variant="primary"
        />
        <OverwriteActionButton
          label={mediaMessages.uploadNameConflictOverwrite}
          onClick={onOverwrite}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
