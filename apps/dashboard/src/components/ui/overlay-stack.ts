/**
 * Module-level ESC-key stack for nested overlays.
 *
 * Each mounted overlay registers a handler via `pushOverlay()` and removes it
 * via the returned cleanup function. When ESC is pressed only the top-most
 * handler fires, so inner overlays close before outer ones.
 */

type EscHandler = () => void;

const stack: EscHandler[] = [];

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape" || stack.length === 0) return;
  e.stopPropagation();
  const top = stack[stack.length - 1];
  top();
}

let listening = false;

/**
 * Register an ESC handler for an overlay. Returns a cleanup function that
 * removes the handler from the stack.
 */
export function pushOverlay(handler: EscHandler): () => void {
  stack.push(handler);

  if (!listening) {
    window.addEventListener("keydown", handleKeyDown);
    listening = true;
  }

  return () => {
    const idx = stack.indexOf(handler);
    if (idx !== -1) stack.splice(idx, 1);

    if (stack.length === 0 && listening) {
      window.removeEventListener("keydown", handleKeyDown);
      listening = false;
    }
  };
}
