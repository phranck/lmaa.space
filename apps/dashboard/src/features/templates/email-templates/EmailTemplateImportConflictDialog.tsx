import { DownloadIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  OverwriteActionButton,
  SkipActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface EmailTemplateImportConflictDialogProps {
  templateName: string;
  onOverwrite: () => void;
  onRename: (newName: string) => void;
  onCancel: () => void;
}

/**
 * Dialog shown when an imported email template name conflicts with an existing one.
 *
 * Offers three choices: overwrite the existing template, import under a new name,
 * or skip this template entirely.
 */
export function EmailTemplateImportConflictDialog({
  templateName,
  onOverwrite,
  onRename,
  onCancel,
}: EmailTemplateImportConflictDialogProps) {
  const { messages } = useI18n();
  const m = messages.emailTemplates;
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState(`${templateName}-copy`);

  return (
    <Dialog
      open={true}
      title={m.importConflictTitle.replace("{name}", templateName)}
      titleIcon={<DownloadIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onCancel}
    >
      <div className="px-6 py-3">
        <p className="text-sm text-[var(--ds-text-muted)] mb-4">{m.importConflictHint}</p>

        {showRename && (
          <div className="mb-4">
            <label
              htmlFor="import-new-name"
              className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
            >
              {m.importNewNameLabel}
            </label>
            <input
              id="import-new-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-1.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-surface)] text-[var(--ds-text)] focus:outline-none focus:border-[var(--ds-border-strong)]"
            />
          </div>
        )}
      </div>

      <Dialog.Footer className="flex flex-col gap-2">
        <OverwriteActionButton label={m.importOverwrite} onClick={onOverwrite} />
        {showRename ? (
          <DashboardButton
            disabled={!newName.trim()}
            leadingIcon={<PencilSimpleIcon weight="duotone" className="size-3.5" />}
            onClick={() => onRename(newName.trim())}
            size="action"
            variant="neutral"
          >
            {m.importRename}
          </DashboardButton>
        ) : (
          <DashboardButton
            leadingIcon={<PencilSimpleIcon weight="duotone" className="size-3.5" />}
            onClick={() => setShowRename(true)}
            size="action"
            variant="neutral"
          >
            {m.importRename}
          </DashboardButton>
        )}
        <SkipActionButton label={m.importSkip} onClick={onCancel} />
      </Dialog.Footer>
    </Dialog>
  );
}
