import { useEffect } from "react";

import { useAuth } from "@/features/auth/AuthContext.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

function observePersistedElementHeight(element: HTMLElement, storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const height = JSON.parse(raw);
      if (typeof height === "number" && height > 30) {
        element.style.height = `${height}px`;
      }
    }
  } catch {
    // ignore
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const box = entry.borderBoxSize?.[0];
      if (!box || box.blockSize < 30) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(Math.round(box.blockSize)));
      } catch {
        // ignore
      }
    }
  });

  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Attaches height persistence once an element is present and re-attaches when
 * a lazy-loaded component replaces its fallback DOM node.
 */
export function observePersistedElementHeightById(elementId: string, storageKey: string) {
  let currentElement: HTMLElement | null = null;
  let hasAttached = false;
  let disconnectHeightObserver = () => {};
  let documentObserver: MutationObserver | undefined;
  let parentObserver: MutationObserver | undefined;

  function attachToCurrentElement() {
    const nextElement = document.getElementById(elementId) as HTMLElement | null;
    if (hasAttached && nextElement === currentElement) return;

    disconnectHeightObserver();
    parentObserver?.disconnect();
    parentObserver = undefined;
    currentElement = nextElement;
    hasAttached = true;

    if (!nextElement) {
      if (!documentObserver) {
        documentObserver = new MutationObserver(attachToCurrentElement);
        documentObserver.observe(document.body, { childList: true, subtree: true });
      }
      return;
    }

    documentObserver?.disconnect();
    documentObserver = undefined;
    disconnectHeightObserver = observePersistedElementHeight(nextElement, storageKey);

    const parent = nextElement.parentElement;
    if (parent) {
      parentObserver = new MutationObserver(attachToCurrentElement);
      parentObserver.observe(parent, { childList: true });
    }
  }

  attachToCurrentElement();
  return () => {
    disconnectHeightObserver();
    documentObserver?.disconnect();
    parentObserver?.disconnect();
  };
}

/**
 * Persists the user-resized height of a textarea across sessions.
 *
 * Waits for the textarea to appear by its DOM `id`, restores the stored height,
 * and observes resize changes via ResizeObserver.
 *
 * @param textareaId - The `id` attribute of the target textarea element.
 * @param storageKey - Base key for localStorage (user-namespaced automatically).
 * @param enabled - Only activate when the textarea is actually in the DOM.
 */
export function usePersistedTextareaHeight(textareaId: string, storageKey: string, enabled = true) {
  const { user } = useAuth();
  const fullKey = getSegmentedStorageKey(user?.id, storageKey);

  useEffect(() => {
    if (!enabled) return;

    return observePersistedElementHeightById(textareaId, fullKey);
  }, [textareaId, fullKey, enabled]);
}
