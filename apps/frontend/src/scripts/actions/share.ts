/**
 * Share button handler: Web Share API with clipboard fallback.
 */

document.addEventListener("click", async (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("[data-action='share']");
  if (!btn) return;

  const url = btn.dataset.shareUrl ?? location.href;
  const title = btn.dataset.shareTitle ?? document.title;

  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled or share failed - no action needed
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
    // Clipboard write not available - silent
  }
});
