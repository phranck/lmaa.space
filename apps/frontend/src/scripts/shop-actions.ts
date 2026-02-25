/**
 * Shop action handlers (dead link reports + concern reports).
 * Uses event delegation — one listener for all shop cards on the page.
 */

// Image fallback: hide broken images and show the letter placeholder next to them.
// Uses capture:true because 'error' does not bubble.
document.addEventListener("error", (e) => {
  const img = e.target as HTMLElement;
  if (!(img instanceof HTMLImageElement) || !("imgFallback" in img.dataset)) return;
  img.style.display = "none";
  const fallback = img.nextElementSibling as HTMLElement | null;
  if (fallback) fallback.style.display = "flex";
}, { capture: true });

import { API_BASE } from "@/lib/client-api";

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
    if (errorMsg) { errorMsg.textContent = ""; errorMsg.classList.add("hidden"); }
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
  dialog?.close();
});

// Handle confirmations
document.addEventListener("click", async (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("[data-confirm]");
  if (!btn) return;

  const action = btn.dataset.confirm;
  const shopId = btn.dataset.shopId;
  if (!action || !shopId) return;

  const dialog = btn.closest("dialog");

  if (action === "dead-link") {
    try {
      await fetch(`${API_BASE}/shops/${shopId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // Silently fail – dead link report is best-effort
    } finally {
      dialog?.close();
      // Update the button area to show "Danke"
      const card = document.querySelector(`[data-shop-id="${shopId}"] [data-shop-actions]`);
      if (card) {
        card.innerHTML = '<span class="text-xs text-stone-400">Danke für deinen Hinweis!</span>';
      }
    }
    return;
  }

  if (action === "report") {
    const textarea = dialog?.querySelector<HTMLTextAreaElement>("[data-reason-input]");
    const errorMsg = dialog?.querySelector<HTMLElement>("[data-error-msg]");
    const reason = textarea?.value.trim() ?? "";

    if (reason.length < 10) {
      if (errorMsg) {
        errorMsg.textContent = "Bitte mindestens 10 Zeichen eingeben.";
        errorMsg.classList.remove("hidden");
      }
      return;
    }

    btn.disabled = true;
    btn.textContent = "Wird gesendet…";

    try {
      await fetch(`${API_BASE}/shops/${shopId}/concern`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const form = dialog?.querySelector<HTMLElement>("[data-report-form]");
      const success = dialog?.querySelector<HTMLElement>("[data-report-success]");
      if (form) form.classList.add("hidden");
      if (success) success.classList.remove("hidden");
    } catch {
      if (errorMsg) {
        errorMsg.textContent = "Fehler beim Absenden. Bitte versuche es erneut.";
        errorMsg.classList.remove("hidden");
      }
      btn.disabled = false;
      btn.textContent = "Melden";
    }
  }
});
