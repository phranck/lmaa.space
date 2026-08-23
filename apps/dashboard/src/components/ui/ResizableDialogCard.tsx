import {
  type ComponentPropsWithoutRef,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { useAuth } from "@/features/auth/AuthContext.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

interface ResizableDialogCardProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
  /** Base key for localStorage, e.g. "submissions:review-modal-size" */
  storageKey: string;
  /** Default width in px, used when no stored size exists */
  defaultWidth?: number;
  /** Default height in px, used when no stored size exists */
  defaultHeight?: number;
  /** Minimum width in px */
  minWidth?: number;
  /** Minimum height in px */
  minHeight?: number;
}

/** The eight places a card can be taken hold of. */
type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/**
 * Where each handle sits and how the pointer looks over it.
 *
 * They are three pixels wide, which is enough to hit and little enough to stay
 * invisible, and the corners are eight so they win over the edges they overlap.
 */
const RESIZE_HANDLES: { name: ResizeHandle; className: string }[] = [
  { name: "n", className: "top-0 left-2 right-2 h-1.5 cursor-ns-resize" },
  { name: "s", className: "bottom-0 left-2 right-2 h-1.5 cursor-ns-resize" },
  { name: "w", className: "left-0 top-2 bottom-2 w-1.5 cursor-ew-resize" },
  { name: "e", className: "right-0 top-2 bottom-2 w-1.5 cursor-ew-resize" },
  { name: "nw", className: "top-0 left-0 size-3 cursor-nwse-resize" },
  { name: "ne", className: "top-0 right-0 size-3 cursor-nesw-resize" },
  { name: "sw", className: "bottom-0 left-0 size-3 cursor-nesw-resize" },
  { name: "se", className: "bottom-0 right-0 size-3 cursor-nwse-resize" },
];

export function ResizableDialogCard({
  storageKey,
  defaultWidth = 448,
  defaultHeight,
  minWidth = 320,
  minHeight = 200,
  className,
  style,
  children,
  ref: forwardedRef,
  ...rest
}: ResizableDialogCardProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDivElement);

  const { user } = useAuth();
  const fullKey = getSegmentedStorageKey(user?.id, storageKey);

  const storedSize = (() => {
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.w === "number" && typeof parsed.h === "number") {
          return parsed as { w: number; h: number };
        }
      }
    } catch {
      // ignore
    }
    return null;
  })();

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.borderBoxSize?.[0];
        if (!box || box.inlineSize < minWidth || box.blockSize < minHeight) return;
        try {
          localStorage.setItem(
            fullKey,
            JSON.stringify({ w: Math.round(box.inlineSize), h: Math.round(box.blockSize) }),
          );
        } catch {
          // ignore
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [fullKey, minWidth, minHeight]);

  const mergedStyle: React.CSSProperties = {
    width: storedSize?.w ?? defaultWidth,
    minWidth,
    minHeight,
    ...(storedSize ? { height: storedSize.h } : defaultHeight ? { height: defaultHeight } : {}),
    ...style,
  };

  /**
   * Resizes from one edge or corner.
   *
   * The card is centred by the overlay around it, so a drag has to move both of
   * its sides at once: the pointer moves by one distance whilst the card grows
   * by twice that, and the middle stays where it is. Dragging one edge
   * otherwise appears to push the card sideways instead of resizing it.
   */
  function startResize(event: React.PointerEvent<HTMLDivElement>, handle: ResizeHandle) {
    const element = innerRef.current;
    if (!element) return;

    event.preventDefault();
    const rect = element.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const move = (pointer: PointerEvent) => {
      const dx = (pointer.clientX - startX) * 2;
      const dy = (pointer.clientY - startY) * 2;

      if (handle.includes("e")) element.style.width = `${Math.max(rect.width + dx, minWidth)}px`;
      if (handle.includes("w")) element.style.width = `${Math.max(rect.width - dx, minWidth)}px`;
      if (handle.includes("s")) element.style.height = `${Math.max(rect.height + dy, minHeight)}px`;
      if (handle.includes("n")) element.style.height = `${Math.max(rect.height - dy, minHeight)}px`;
    };

    const stop = () => {
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
    };

    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
  }

  return (
    <div
      ref={innerRef}
      className={[
        "relative bg-[var(--ds-surface)] border border-[rgba(255,255,255,0.06)] max-w-[calc(100vw-2rem)] overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={mergedStyle}
      {...rest}
    >
      {children}
      {RESIZE_HANDLES.map((handle) => (
        <div
          key={handle.name}
          aria-hidden="true"
          className={`absolute ${handle.className}`}
          onPointerDown={(event) => startResize(event, handle.name)}
        />
      ))}
    </div>
  );
}
