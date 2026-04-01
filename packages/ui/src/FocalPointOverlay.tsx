import { ArrowsVerticalIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook that provides focal point Y drag state and persistence.
 *
 * @param initialValue - Initial focal point Y (0-100, default 50).
 * @param onCommit - Called with the final Y value when the user releases the drag.
 * @returns `{ focalY, containerRef, startDrag }` to wire up the overlay.
 */
export function useFocalPointDrag(
  initialValue: number,
  onCommit: (focalPointY: number) => void,
) {
  const [focalY, setFocalY] = useState(initialValue);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFocalY(initialValue);
  }, [initialValue]);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const calcY = (clientY: number) => {
        const el = containerRef.current;
        if (!el) return 50;
        const rect = el.getBoundingClientRect();
        return Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100)));
      };

      setFocalY(calcY(e.clientY));

      const onMove = (ev: MouseEvent) => setFocalY(calcY(ev.clientY));
      const onUp = (ev: MouseEvent) => {
        const y = calcY(ev.clientY);
        setFocalY(y);
        onCommit(y);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onCommit],
  );

  return { focalY, containerRef, startDrag };
}

interface FocalPointOverlayProps {
  /** Current focal point Y position (0-100). */
  focalY: number;
  /** Mouse-down handler to start the drag interaction. */
  onMouseDown: (e: React.MouseEvent) => void;
  /** Optional accessible title for the drag handle. */
  title?: string;
}

/**
 * Horizontal line with drag handle that indicates and controls the vertical
 * focal point of an image. Render inside a `position: relative` container.
 */
export function FocalPointOverlay({ focalY, onMouseDown, title }: FocalPointOverlayProps) {
  return (
    <div
      className="absolute inset-x-0 z-20 flex items-center cursor-ns-resize select-none"
      style={{ top: `${focalY}%`, transform: "translateY(-50%)" }}
      onMouseDown={onMouseDown}
      title={title}
    >
      <div className="w-full h-px bg-red-500/70 shadow-[0_0_3px_rgba(0,0,0,0.8)] group-hover:bg-red-500 transition-colors" />
      <div className="absolute right-1.5 w-5 h-5 rounded-full bg-red-500/80 group-hover:bg-red-500 flex items-center justify-center shadow-md transition-colors">
        <ArrowsVerticalIcon weight="bold" className="w-3 h-3 text-white" />
      </div>
    </div>
  );
}
