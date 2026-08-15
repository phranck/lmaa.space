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
    resize: "both",
    width: storedSize?.w ?? defaultWidth,
    minWidth,
    minHeight,
    ...(storedSize ? { height: storedSize.h } : defaultHeight ? { height: defaultHeight } : {}),
    ...style,
  };

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
    </div>
  );
}
