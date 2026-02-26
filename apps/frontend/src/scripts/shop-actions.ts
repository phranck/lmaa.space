/**
 * Shop action handlers (dead link reports + concern reports).
 * Uses event delegation — one listener for all shop cards on the page.
 */

// Image fallback: hide broken images and show the letter placeholder next to them.
// Uses capture:true because 'error' does not bubble.
document.addEventListener(
  "error",
  (e) => {
    const img = e.target as HTMLElement;
    if (!(img instanceof HTMLImageElement) || !("imgFallback" in img.dataset)) return;
    img.style.display = "none";
    const fallback = img.nextElementSibling as HTMLElement | null;
    if (fallback) fallback.style.display = "flex";
  },
  { capture: true },
);

import { API_BASE } from "@/lib/client-api";

interface RequestError extends Error {
  status?: number;
  responseMessage?: string | null;
}

function extractApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const error = "error" in payload ? (payload as { error?: unknown }).error : undefined;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }

  const message = "message" in payload ? (payload as { message?: unknown }).message : undefined;
  return typeof message === "string" ? message : null;
}

function getConcernErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Verbindung zum Server fehlgeschlagen. Bitte prüfe deine Verbindung.";
  }

  const typedError = error as RequestError;
  const status = typedError.status;

  if (status === 429) {
    return "Zu viele Meldungen von deiner Verbindung. Bitte versuche es später erneut.";
  }

  if (status === 400) {
    return (
      typedError.responseMessage ??
      "Bitte gib eine aussagekräftige Begründung ein und versuche es erneut."
    );
  }

  if (status && status >= 500) {
    return "Serverfehler beim Absenden. Bitte versuche es später erneut.";
  }

  if (typedError.responseMessage) return typedError.responseMessage;
  if (status) return `Absenden fehlgeschlagen (HTTP ${status}). Bitte später erneut versuchen.`;

  return "Fehler beim Absenden. Bitte versuche es erneut.";
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
      const response = await fetch(`${API_BASE}/shops/${shopId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(`Dead-link report failed (${response.status})`);
      }
      // Update the button area to show "Danke"
      const card = document.querySelector(`[data-shop-id="${shopId}"] [data-shop-actions]`);
      if (card) {
        card.innerHTML = '<span class="text-xs text-stone-400">Danke für deinen Hinweis!</span>';
      }
    } catch {
      // Silently fail – dead link report is best-effort
    } finally {
      dialog?.close();
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
      const response = await fetch(`${API_BASE}/shops/${shopId}/concern`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const requestError = new Error("Concern request failed") as RequestError;
        requestError.status = response.status;
        requestError.responseMessage = extractApiErrorMessage(payload);
        throw requestError;
      }

      const form = dialog?.querySelector<HTMLElement>("[data-report-form]");
      const success = dialog?.querySelector<HTMLElement>("[data-report-success]");
      if (form) form.classList.add("hidden");
      if (success) success.classList.remove("hidden");
    } catch (error) {
      if (errorMsg) {
        errorMsg.textContent = getConcernErrorMessage(error);
        errorMsg.classList.remove("hidden");
      }
      btn.disabled = false;
      btn.textContent = "Melden";
    }
  }
});
