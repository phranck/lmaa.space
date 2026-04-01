/**
 * Dialog management: open/close/dismiss dialogs with optional exit animation.
 */

export function closeDialog(dialog: HTMLDialogElement): void {
  if (!("animated" in dialog.dataset)) {
    dialog.close();
    return;
  }
  dialog.classList.add("is-closing");
  setTimeout(() => {
    dialog.classList.remove("is-closing");
    dialog.close();
  }, 500);
}

// Open a dialog when action button is clicked
document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("[data-action]");
  if (!btn) return;

  const dialogId = btn.dataset.dialog;
  if (!dialogId) return;
  const dialog = document.getElementById(dialogId) as HTMLDialogElement | null;
  if (!dialog) return;

  // Reset report dialog state before opening
  if (btn.dataset.action === "report") {
    const textarea = dialog.querySelector<HTMLTextAreaElement>("[data-reason-input]");
    const errorMsg = dialog.querySelector<HTMLElement>("[data-error-msg]");
    const form = dialog.querySelector<HTMLElement>("[data-report-form]");
    const success = dialog.querySelector<HTMLElement>("[data-report-success]");
    if (textarea) textarea.value = "";
    if (errorMsg) {
      errorMsg.textContent = "";
      errorMsg.classList.add("hidden");
    }
    if (form) form.classList.remove("hidden");
    if (success) success.classList.add("hidden");
  }

  dialog.showModal();
});

// Dismiss (close) a dialog
document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLElement>("[data-dismiss]");
  if (!btn) return;
  const dialog = btn.closest("dialog");
  if (!dialog) return;
  closeDialog(dialog);
});

// Intercept Escape key for animated dialogs so the exit animation can play
document.addEventListener("cancel", (e) => {
  const dialog = e.target as HTMLDialogElement;
  if (!("animated" in dialog.dataset)) return;
  e.preventDefault();
  closeDialog(dialog);
});
