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

function closeDialog(dialog: HTMLDialogElement) {
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

// ── Browser fingerprint ─────────────────────────────────────────────
async function generateFingerprint(): Promise<string> {
  const parts = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth),
  ];
  const data = new TextEncoder().encode(parts.join("|"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

import { getLikedShopIds, saveLikedShopIds } from "@/lib/liked-shops";

// ── Like (localStorage) ──────────────────────────────────────────────

function saveLikedShopsAndUpdateNav(ids: Set<string>) {
  saveLikedShopIds(ids);
  updateMyShopsNavVisibility(ids.size > 0);
}

function updateMyShopsNavVisibility(visible: boolean) {
  document.querySelectorAll<HTMLElement>("[data-my-shops-link]").forEach((el) => {
    if (visible) {
      el.classList.remove("hidden");
      el.classList.add(el.dataset.myShopsLink === "desktop" ? "md:flex" : "block");
    } else {
      el.classList.add("hidden");
      el.classList.remove("md:flex", "block");
    }
  });
}

function applyLikeState(btn: HTMLElement, liked: boolean) {
  const regular = btn.querySelector<HTMLElement>(".like-icon-regular");
  const duotone = btn.querySelector<HTMLElement>(".like-icon-duotone");
  if (liked) {
    regular?.classList.add("hidden");
    duotone?.classList.remove("hidden");
    btn.classList.remove("text-stone-400");
    btn.classList.add("text-red-500");
  } else {
    regular?.classList.remove("hidden");
    duotone?.classList.add("hidden");
    btn.classList.add("text-stone-400");
    btn.classList.remove("text-red-500");
  }
}

// Restore like state on page load (detail page button)
document.querySelectorAll<HTMLElement>("[data-action='like']").forEach((btn) => {
  const shopId = btn.dataset.shopId;
  if (shopId && getLikedShopIds().has(shopId)) {
    applyLikeState(btn, true);
  }
});

// Show like indicators on Astro-rendered shop cards
const likedShops = getLikedShopIds();
document.querySelectorAll<HTMLElement>("[data-shop-id]").forEach((card) => {
  const shopId = card.dataset.shopId;
  if (shopId && likedShops.has(shopId)) {
    const indicator = card.querySelector<HTMLElement>("[data-like-indicator]");
    indicator?.classList.remove("hidden");
  }
});

// Heart-bubble animation
function spawnHeartBubbles(btn: HTMLElement) {
  const count = 6;
  for (let i = 0; i < count; i++) {
    const bubble = document.createElement("span");
    bubble.className = "heart-bubble";
    bubble.textContent = "\u2764";
    // Random horizontal offset (-14px to +14px) and animation delay
    const xOffset = Math.random() * 28 - 14;
    const delay = Math.random() * 150;
    const scale = 0.5 + Math.random() * 0.6;
    bubble.style.left = `calc(50% + ${xOffset}px)`;
    bubble.style.animationDelay = `${delay}ms`;
    bubble.style.setProperty("--bubble-scale", String(scale));
    btn.appendChild(bubble);
    // Clean up after animation
    bubble.addEventListener("animationend", () => bubble.remove());
  }
}

// Handle like toggle
document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("[data-action='like']");
  if (!btn) return;

  const shopId = btn.dataset.shopId;
  if (!shopId) return;

  const liked = getLikedShopIds();
  const isNowLiked = !liked.has(shopId);

  if (isNowLiked) {
    liked.add(shopId);
    spawnHeartBubbles(btn);
  } else {
    liked.delete(shopId);
  }

  saveLikedShopsAndUpdateNav(liked);
  applyLikeState(btn, isNowLiked);

  // Optimistic like count update
  const countEl = document.querySelector<HTMLElement>(
    `[data-like-count-value][data-shop-id="${shopId}"]`,
  );
  if (countEl) {
    const current = Number.parseInt(countEl.textContent ?? "0", 10);
    const next = Math.max(0, current + (isNowLiked ? 1 : -1));
    countEl.textContent = String(next);
    countEl.classList.toggle("hidden", next === 0);
  } else if (isNowLiked) {
    // Create count element if it does not exist yet (first like)
    const wrapper = btn.parentElement;
    if (wrapper) {
      const span = document.createElement("span");
      span.className = "text-xs text-stone-400 tabular-nums leading-none";
      span.dataset.likeCountValue = "";
      span.dataset.shopId = shopId;
      span.textContent = "1";
      wrapper.insertBefore(span, btn);
    }
  }

  // Fire-and-forget: sync like to server
  const likeToken = btn.dataset.likeToken;
  if (likeToken) {
    generateFingerprint().then((fp) => {
      fetch(`${API_BASE}/shops/${shopId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: isNowLiked, token: likeToken, fingerprint: fp }),
      }).catch(() => {
        /* silent - like is best-effort */
      });
    });
  }
});

// Handle share action
document.addEventListener("click", async (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("[data-action='share']");
  if (!btn) return;

  const url = btn.dataset.shareUrl ?? location.href;
  const title = btn.dataset.shareTitle ?? document.title;

  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled or share failed — no action needed
    }
    return;
  }

  // Clipboard fallback with brief visual feedback
  try {
    await navigator.clipboard.writeText(url);
    const originalLabel = btn.getAttribute("aria-label") ?? "";
    btn.setAttribute("aria-label", "Link kopiert!");
    btn.style.color = "#b45309"; // amber-700
    setTimeout(() => {
      btn.style.removeProperty("color");
      btn.setAttribute("aria-label", originalLabel);
    }, 2000);
  } catch {
    // Clipboard write not available — silent
  }
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
