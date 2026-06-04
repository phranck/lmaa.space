import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
} from "react";

export function useGridKeyboardNavigation({
  containerRef,
  itemSelector,
  itemCount,
  enabled = true,
}: {
  containerRef: RefObject<HTMLElement | null>;
  itemSelector: string;
  itemCount: number;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;
    const items = collectItems(container, itemSelector);
    if (items.length === 0) return;
    let assigned = false;
    for (const item of items) {
      if (!assigned && !isDisabled(item)) {
        item.tabIndex = 0;
        assigned = true;
      } else {
        item.tabIndex = -1;
      }
    }
  }, [containerRef, itemSelector, itemCount, enabled]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!enabled) return;
      const container = containerRef.current;
      if (!container) return;
      const items = collectItems(container, itemSelector);
      if (items.length === 0) return;

      if (event.key === "Enter" || event.key === " ") {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || !items.includes(active)) return;
        event.preventDefault();
        active.click();
        return;
      }

      const navKeys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
      if (!navKeys.includes(event.key)) return;

      const active = document.activeElement;
      let currentIndex = -1;
      if (active instanceof HTMLElement) {
        currentIndex = items.indexOf(active);
      }
      if (currentIndex === -1) currentIndex = items.findIndex((item) => item.tabIndex === 0);
      if (currentIndex === -1) currentIndex = 0;

      const columns = computeColumnCount(items);
      let nextIndex = currentIndex;
      switch (event.key) {
        case "ArrowRight":
          nextIndex = Math.min(currentIndex + 1, items.length - 1);
          break;
        case "ArrowLeft":
          nextIndex = Math.max(currentIndex - 1, 0);
          break;
        case "ArrowDown":
          nextIndex = Math.min(currentIndex + columns, items.length - 1);
          break;
        case "ArrowUp":
          nextIndex = Math.max(currentIndex - columns, 0);
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = items.length - 1;
          break;
      }

      const step = nextIndex > currentIndex ? 1 : nextIndex < currentIndex ? -1 : 0;
      if (step !== 0) {
        while (nextIndex >= 0 && nextIndex < items.length && isDisabled(items[nextIndex])) {
          nextIndex += step;
        }
        if (nextIndex < 0 || nextIndex >= items.length) return;
      } else if (isDisabled(items[nextIndex])) {
        return;
      }

      if (nextIndex === currentIndex) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      items[currentIndex].tabIndex = -1;
      items[nextIndex].tabIndex = 0;
      items[nextIndex].focus();
      items[nextIndex].click();
    },
    [containerRef, itemSelector, enabled],
  );

  return { onKeyDown };
}

function collectItems(container: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

function isDisabled(item: HTMLElement): boolean {
  return item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true";
}

function computeColumnCount(items: HTMLElement[]): number {
  if (items.length <= 1) return Math.max(items.length, 1);
  const firstTop = items[0].getBoundingClientRect().top;
  let columns = 0;
  for (const item of items) {
    if (Math.abs(item.getBoundingClientRect().top - firstTop) < 1) columns += 1;
    else break;
  }
  return columns || 1;
}
