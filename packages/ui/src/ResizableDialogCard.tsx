import {
  type ComponentPropsWithoutRef,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

/**
 * The size a resizable overlay card opens at and how small it may become.
 *
 * @property storageKey - The `localStorage` key the card's size is kept under,
 *   exactly as written. An app that keeps sizes per user scopes the key before
 *   it gets here.
 * @property defaultWidth - The width in pixels while nothing is stored.
 * @property defaultHeight - The height in pixels while nothing is stored. Left
 *   out, the card is as high as its content.
 * @property minWidth - The narrowest the card can be dragged, in pixels.
 * @property minHeight - The lowest the card can be dragged, in pixels.
 */
export interface ResizableCardSize {
  storageKey: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

interface ResizableDialogCardProps
  extends ResizableCardSize, Omit<ComponentPropsWithoutRef<"dialog">, "open"> {
  ref?: Ref<HTMLDialogElement>;
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

/**
 * An overlay card that can be resized from every edge and corner and opens at
 * the size it was left at.
 *
 * The size is read from `localStorage` when the card mounts and written back
 * whenever it changes, as long as it stays above the minimum. The card renders
 * as an open `<dialog>` element, so the overlay around it gives it its role.
 */
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
  const innerRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDialogElement);

  const storedSize = (() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.w === "number" && typeof parsed.h === "number") {
          return parsed as { w: number; h: number };
        }
      }
    } catch {
      // A size that cannot be read is no size, and the card opens at its default.
    }
    return null;
  })();

  useEffect(() => {
    const element = innerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.borderBoxSize?.[0];
        if (!box || box.inlineSize < minWidth || box.blockSize < minHeight) return;
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ w: Math.round(box.inlineSize), h: Math.round(box.blockSize) }),
          );
        } catch {
          // Storage can be full or blocked. The card still works, it only forgets.
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [storageKey, minWidth, minHeight]);

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
   * The card is centered by the overlay around it, so a drag has to move both
   * of its sides at once: the pointer moves by one distance while the card
   * grows by twice that, and the middle stays where it is. Dragging one edge
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
    <dialog
      open
      ref={innerRef}
      className={[
        "relative m-0 p-0 bg-[var(--ds-surface)] border border-[rgba(255,255,255,0.06)] max-w-[calc(100vw-2rem)] overflow-hidden",
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
    </dialog>
  );
}
