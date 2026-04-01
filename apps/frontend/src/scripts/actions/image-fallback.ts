/**
 * Image fallback: hide broken images and show the letter placeholder next to them.
 * Uses capture:true because 'error' does not bubble.
 */
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
