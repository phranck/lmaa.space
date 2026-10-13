import { createContext } from "react";

/**
 * Module-level overlay layer manager for nested dialogs/alerts/drawers.
 *
 * Tracks layer order so the top-most overlay alone owns Escape handling,
 * focus trapping and interactive backdrop behavior.
 */

export type OverlayLayerZIndex = number | string;

export const OverlayLayerZIndexContext = createContext<OverlayLayerZIndex | undefined>(undefined);

type EscHandler = () => void;

interface OverlayLayer {
  id: string;
  onEscape: EscHandler;
}

const stack: OverlayLayer[] = [];
let stackSnapshot: string[] = [];
const listeners = new Set<() => void>();

function syncSnapshot() {
  stackSnapshot = stack.map((layer) => layer.id);
}

function emit() {
  for (const listener of listeners) listener();
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape" || stack.length === 0) return;
  e.stopPropagation();
  stack[stack.length - 1]?.onEscape();
}

let listening = false;

/** Returns the current snapshot of active overlay IDs in stack order (bottom to top). */
export function getOverlayStackSnapshot(): string[] {
  return stackSnapshot;
}

/**
 * Subscribes to overlay stack changes.
 *
 * @param listener - Called whenever the stack changes.
 * @returns Unsubscribe function.
 */
export function subscribeOverlayStack(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Register an overlay layer in stack order. Returns a cleanup function that
 * removes it again.
 */
export function registerOverlay(id: string, onEscape: EscHandler): () => void {
  stack.push({ id, onEscape });
  syncSnapshot();
  emit();

  if (!listening) {
    window.addEventListener("keydown", handleKeyDown);
    listening = true;
  }

  return () => {
    const idx = stack.findIndex((layer) => layer.id === id);
    if (idx !== -1) {
      stack.splice(idx, 1);
      syncSnapshot();
      emit();
    }

    if (stack.length === 0 && listening) {
      window.removeEventListener("keydown", handleKeyDown);
      listening = false;
    }
  };
}

export function resolveOverlayZIndex(
  zIndex: OverlayLayerZIndex,
  offset: number,
): OverlayLayerZIndex {
  if (offset === 0) {
    return zIndex;
  }
  if (typeof zIndex === "number") {
    return zIndex + offset;
  }
  return `calc(${zIndex} + ${offset})`;
}
