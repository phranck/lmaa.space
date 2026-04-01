/**
 * Confirmation handlers: dead link reports + concern reports.
 */

import { type ApiRequestError, createApiRequestError } from "@lmaa/shared";

import { API_BASE } from "@/lib/client-api";

function getConcernErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Verbindung zum Server fehlgeschlagen. Bitte prüfe deine Verbindung.";
  }

  const typedError = error as ApiRequestError;
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
      // Silently fail - dead link report is best-effort
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
    btn.textContent = "Wird gesendet\u2026";

    try {
      const response = await fetch(`${API_BASE}/shops/${shopId}/concern`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        throw await createApiRequestError(response, "Concern request failed");
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
