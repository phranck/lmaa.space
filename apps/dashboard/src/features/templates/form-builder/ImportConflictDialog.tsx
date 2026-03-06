import { Dialog, dialogBtnSecondary } from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useState } from "react";

interface ImportConflictDialogProps {
  formName: string;
  onOverwrite: () => void;
  onRename: (newName: string) => void;
  onCancel: () => void;
}

/**
 * Dialog shown when an imported form name conflicts with an existing one.
 *
 * Offers three choices: overwrite the existing form, import under a new name,
 * or skip this form entirely.
 *
 * @param props - Form name, and action callbacks for each choice.
 */
export function ImportConflictDialog({
  formName,
  onOverwrite,
  onRename,
  onCancel,
}: ImportConflictDialogProps) {
  const { messages } = useI18n();
  const fb = messages.formBuilder;
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState(`${formName}-copy`);

  return (
    <Dialog
      open={true}
      title={fb.importConflictTitle.replace("{name}", formName)}
      onClose={onCancel}
    >
      <div className="px-6 py-3">
        <p className="text-sm text-[var(--ds-text-muted)] mb-4">{fb.importConflictHint}</p>

        {showRename && (
          <div className="mb-4">
            <label
              htmlFor="import-new-name"
              className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
            >
              {fb.importNewNameLabel}
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
          {fb.importOverwrite}
        </button>
        {showRename ? (
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={() => onRename(newName.trim())}
            className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm font-medium text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] transition-colors disabled:opacity-50"
          >
            {fb.importRename}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowRename(true)}
            className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm font-medium text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] transition-colors"
          >
            {fb.importRename}
          </button>
        )}
        <button type="button" onClick={onCancel} className={dialogBtnSecondary}>
          {fb.importSkip}
        </button>
      </Dialog.Footer>
    </Dialog>
  );
}
