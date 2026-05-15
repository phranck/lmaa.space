/**
 * Like toggle: localStorage persistence, UI state, heart bubbles, server sync.
 */

import { API_BASE } from "@/lib/client-api";
import { getLikedShopIds, saveLikedShopIds } from "@/lib/liked-shops";

// ── Browser fingerprint ─────────────────────────────────────────────
let cachedFingerprint: string | null = null;

async function generateFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;

  const parts = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth),
  ];
  const data = new TextEncoder().encode(parts.join("|"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  const result = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  cachedFingerprint = result;
  return result;
}

// ── Nav visibility ──────────────────────────────────────────────────
function saveLikedShopsAndUpdateNav(ids: Set<string>): void {
  saveLikedShopIds(ids);
  updateMyShopsNavVisibility(ids.size > 0);
}

function updateMyShopsNavVisibility(visible: boolean): void {
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

// ── Like state UI ───────────────────────────────────────────────────
function applyLikeState(btn: HTMLElement, liked: boolean): void {
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

// ── Restore like state on page load (detail page button) ────────────
document.querySelectorAll<HTMLElement>("[data-action='like']").forEach((btn) => {
  const shopId = btn.dataset.shopId;
  if (shopId && getLikedShopIds().has(shopId)) {
    applyLikeState(btn, true);
  }
});

// ── Show like indicators on Astro-rendered shop cards ───────────────
const likedShops = getLikedShopIds();
document.querySelectorAll<HTMLElement>("[data-shop-id]").forEach((card) => {
  const shopId = card.dataset.shopId;
  if (shopId && likedShops.has(shopId)) {
    const indicator = card.querySelector<HTMLElement>("[data-like-indicator]");
    indicator?.classList.remove("hidden");
  }
});

// ── Heart-bubble animation ──────────────────────────────────────────
function spawnHeartBubbles(btn: HTMLElement): void {
  const count = 6;
  for (let i = 0; i < count; i++) {
    const bubble = document.createElement("span");
    bubble.className = "heart-bubble";
    bubble.textContent = "\u2764";
    // Random horizontal offset (-14px to +14px) and animation delay
    const xOffset = Math.random() * 28 - 14;
    const delay = Math.random() * 150;
    const scale = 0.5 + Math.random() * 0.6;
    bubble.style.cssText = `left: calc(50% + ${xOffset}px); animation-delay: ${delay}ms; --bubble-scale: ${scale};`;
    btn.appendChild(bubble);
    // Clean up after animation
    bubble.addEventListener("animationend", () => bubble.remove());
  }
}

// ── Handle like toggle ──────────────────────────────────────────────
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
