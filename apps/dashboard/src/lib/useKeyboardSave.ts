import { useEffect, useRef } from "react";

/**
 * Triggers a save callback on Cmd+S / Ctrl+S while the hook is enabled.
 *
 * @param handler - Called when the shortcut fires. Use a ref-stable wrapper internally.
 * @param enabled - Gate the listener (e.g. only while a modal is open).
 */
export function useKeyboardSave(handler: () => void, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handlerRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
