import { TrashIcon } from "@phosphor-icons/react";

import { Dialog, dialogBtnDestructive, dialogBtnSecondary, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";

interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  cancelLabel: string;
  deleteLabel: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  deleteLabel,
  isPending = false,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onClose}
    >
      {description && (
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">{description}</p>
        </div>
      )}
      <Dialog.Footer>
        <button type="button" onClick={onClose} className={dialogBtnSecondary}>
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className={`${dialogBtnDestructive} flex items-center gap-2`}
        >
          <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
          {isPending ? "..." : deleteLabel}
        </button>
      </Dialog.Footer>
    </Dialog>
  );
}
