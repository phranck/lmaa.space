import { TrashIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { CancelActionButton, DeleteActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";

interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  cancelLabel: string;
  deleteLabel: string;
  isPending?: boolean;
  /**
   * Replaces the bin in the header, for a confirmation that is destructive
   * without being a deletion. Sized by `dialogHeaderIconClass` like the default.
   */
  titleIcon?: ReactNode;
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
  titleIcon,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      titleIcon={titleIcon ?? <TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onClose}
    >
      {description && (
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">{description}</p>
        </div>
      )}
      <Dialog.Footer>
        <CancelActionButton label={cancelLabel} onClick={onClose} />
        <DeleteActionButton
          disabled={isPending}
          label={isPending ? "..." : deleteLabel}
          onClick={onConfirm}
        />
      </Dialog.Footer>
    </Dialog>
  );
}
