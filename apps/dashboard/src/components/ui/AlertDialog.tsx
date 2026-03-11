import { InfoIcon } from "@phosphor-icons/react";

import { Dialog, dialogBtnPrimary, dialogHeaderIconClass } from "./Dialog.tsx";

interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonLabel?: string;
}

/**
 * Simple modal alert for error or info messages with a single dismiss button.
 */
export function AlertDialog({
  open,
  title,
  message,
  onClose,
  buttonLabel = "OK",
}: AlertDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      titleIcon={<InfoIcon weight="duotone" className={dialogHeaderIconClass} />}
      onClose={onClose}
    >
      <div className="px-6 py-4 text-sm text-[var(--ds-text)]">{message}</div>
      <Dialog.Footer>
        <button type="button" className={dialogBtnPrimary} onClick={onClose}>
          {buttonLabel}
        </button>
      </Dialog.Footer>
    </Dialog>
  );
}
