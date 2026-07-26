import { ArrowsVerticalIcon } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

/**
 * Hook that provides focal point Y drag state and persistence.
 *
 * @param initialValue - Initial focal point Y (0-100, default 50).
 * @param onCommit - Called with the final Y value when the user releases the drag.
 * @returns `{ focalY, containerRef, startDrag }` to wire up the overlay.
 */
export function useFocalPointDrag(initialValue: number, onCommit: (focalPointY: number) => void) {
  const [dragState, setDragState] = useState({ initialValue, focalY: initialValue });
  const containerRef = useRef<HTMLDivElement>(null);
  const focalY = dragState.initialValue === initialValue ? dragState.focalY : initialValue;

  const startDrag = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const calcY = (clientY: number) => {
        const el = containerRef.current;
        if (!el) return 50;
        const rect = el.getBoundingClientRect();
        return Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100)));
      };

      setDragState({ initialValue, focalY: calcY(e.clientY) });

      const onMove = (ev: MouseEvent) => setDragState({ initialValue, focalY: calcY(ev.clientY) });
      const onUp = (ev: MouseEvent) => {
        const y = calcY(ev.clientY);
        setDragState({ initialValue, focalY: y });
        onCommit(y);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [initialValue, onCommit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      let nextValue: number;
      switch (event.key) {
        case "ArrowUp":
          nextValue = focalY - 1;
          break;
        case "ArrowDown":
          nextValue = focalY + 1;
          break;
        case "PageUp":
          nextValue = focalY - 10;
          break;
        case "PageDown":
          nextValue = focalY + 10;
          break;
        case "Home":
          nextValue = 0;
          break;
        case "End":
          nextValue = 100;
          break;
        default:
          return;
      }

      event.preventDefault();
      event.stopPropagation();
      const clampedValue = Math.max(0, Math.min(100, nextValue));
      setDragState({ initialValue, focalY: clampedValue });
      onCommit(clampedValue);
    },
    [focalY, initialValue, onCommit],
  );

  return { focalY, containerRef, startDrag, handleKeyDown };
}

interface FocalPointOverlayProps {
  /** Current focal point Y position (0-100). */
  focalY: number;
  /** Mouse-down handler to start the drag interaction. */
  onMouseDown: (e: ReactMouseEvent) => void;
  /** Keyboard handler for arrow, page, home, and end controls. */
  onKeyDown: (e: KeyboardEvent) => void;
  /** Optional accessible title for the drag handle. */
  title?: string;
}

/**
 * Horizontal line with drag handle that indicates and controls the vertical
 * focal point of an image. Render inside a `position: relative` container.
 */
export function FocalPointOverlay({ focalY, onKeyDown, onMouseDown, title }: FocalPointOverlayProps) {
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-valuenow={focalY}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={title ?? "Focal point"}
      className="absolute inset-x-0 z-20 flex items-center cursor-ns-resize select-none outline-none"
      style={{ top: `${focalY}%`, transform: "translateY(-50%)" }}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      title={title}
    >
      <div className="w-full h-[3px] bg-red-500/70 shadow-[0_0_3px_rgba(0,0,0,0.8)] group-hover:bg-red-500 transition-colors" />
      <div className="absolute right-1.5 w-5 h-5 rounded-full bg-red-500 group-hover:bg-red-600 flex items-center justify-center shadow-md transition-colors border border-white/80">
        <ArrowsVerticalIcon weight="bold" className="w-3 h-3 text-white" />
      </div>
    </div>
  );
}
