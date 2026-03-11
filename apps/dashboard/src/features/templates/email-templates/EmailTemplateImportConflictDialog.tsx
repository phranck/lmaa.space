import { useState } from "react";

import { Dialog, dialogBtnSecondary, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { DownloadIcon } from "@phosphor-icons/react";

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
        <button
          type="button"
          onClick={onOverwrite}
          className="h-9 px-4 bg-[var(--ds-accent)] text-white rounded-control text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {m.importOverwrite}
        </button>
        {showRename ? (
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={() => onRename(newName.trim())}
            className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm font-medium text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] transition-colors disabled:opacity-50"
          >
            {m.importRename}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowRename(true)}
            className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm font-medium text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] transition-colors"
          >
            {m.importRename}
          </button>
        )}
        <button type="button" onClick={onCancel} className={dialogBtnSecondary}>
          {m.importSkip}
        </button>
      </Dialog.Footer>
    </Dialog>
  );
}
