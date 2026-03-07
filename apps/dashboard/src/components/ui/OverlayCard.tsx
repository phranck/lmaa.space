import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { pushOverlay } from "./overlay-stack.ts";
import { ResizableDialogCard } from "./ResizableDialogCard.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResizableSize = {
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  minHeight?: number;
};

interface OverlayCardProps {
  open: boolean;
  onClose: () => void;
  size: "fixed-sm" | "fixed-md" | "fullscreen" | ResizableSize;
  "aria-label": string;
  className?: string;
  style?: React.CSSProperties;
  /** Allow closing via backdrop click. Default: false */
  backdropClose?: boolean;
  /** z-index layer. Default: 50 */
  zIndex?: number;
  /** Custom ESC handler. Return false to prevent close. */
  onEscape?: () => boolean;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function Header({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={[
        "px-5 py-4 bg-[var(--ds-surface-inset)] border-b border-[var(--ds-border-subtle)] shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

function Footer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={[
        "px-5 py-4 bg-[var(--ds-surface-inset)] border-t border-[var(--ds-border-subtle)] shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

function Body({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={["flex-1 overflow-y-auto p-5", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Focus trap helper
// ---------------------------------------------------------------------------

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
  if (e.key !== "Tab" || !container) return;
  const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// ---------------------------------------------------------------------------
// OverlayCard
// ---------------------------------------------------------------------------

export function OverlayCard({
  open,
  onClose,
  size,
  "aria-label": ariaLabel,
  className,
  style,
  backdropClose = false,
  zIndex = 50,
  onEscape,
  children,
}: OverlayCardProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [closing, setClosing] = useState(false);

  const startClose = useCallback(() => {
    setClosing(true);
  }, []);

  // ESC stack registration
  useEffect(() => {
    if (!open || closing) return;
    const handler = () => {
      if (onEscape) {
        if (onEscape() === false) return;
      }
      startClose();
    };
    return pushOverlay(handler);
  }, [open, closing, onEscape, startClose]);

  // Focus management
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [open]);

  // Focus trap via Tab key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => trapFocus(e, dialogRef.current);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  const handleBackdropAnimationEnd = (e: React.AnimationEvent) => {
    if (closing && e.target === e.currentTarget) {
      setClosing(false);
      onClose();
    }
  };

  const handleBackdropClick = backdropClose ? startClose : undefined;

  // Resolve size configuration
  const isResizable = typeof size === "object";
  const isFullscreen = size === "fullscreen";
  const fixedMaxWidth = size === "fixed-sm" ? "max-w-sm" : size === "fixed-md" ? "max-w-md" : "";

  const cardAnimClass = closing ? "overlay-card-exit" : "overlay-card-enter";

  // Shared ARIA props for the dialog container
  const dialogProps = {
    role: "dialog" as const,
    "aria-modal": true as const,
    "aria-label": ariaLabel,
  };

  const renderCard = () => {
    if (isResizable) {
      const { storageKey, defaultWidth, minWidth, minHeight } = size;
      return (
        <ResizableDialogCard
          ref={dialogRef}
          storageKey={storageKey}
          defaultWidth={defaultWidth}
          minWidth={minWidth}
          minHeight={minHeight}
          className={[
            "flex flex-col rounded-[var(--radius-card)] shadow-2xl",
            cardAnimClass,
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={style}
          {...dialogProps}
        >
          {children}
        </ResizableDialogCard>
      );
    }

    if (isFullscreen) {
      return (
        <div
          ref={dialogRef}
          className={[
            "relative bg-[var(--ds-surface)] border border-[rgba(255,255,255,0.06)] rounded-[var(--radius-card)] shadow-2xl flex flex-col overflow-hidden",
            cardAnimClass,
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width: "85vw", height: "85vh", ...style }}
          {...dialogProps}
        >
          {children}
        </div>
      );
    }

    // fixed-sm / fixed-md
    return (
      <div
        ref={dialogRef}
        className={[
          `relative bg-[var(--ds-surface)] border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-xl w-full ${fixedMaxWidth}`,
          cardAnimClass,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={style}
        {...dialogProps}
      >
        {children}
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center px-4 backdrop-blur-xl ${closing ? "overlay-backdrop-exit" : "overlay-backdrop-enter"}`}
      style={{ zIndex }}
      onAnimationEnd={handleBackdropAnimationEnd}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click handled separately, ESC via overlay-stack */}
      <div className="absolute inset-0" aria-hidden="true" onClick={handleBackdropClick} />
      {renderCard()}
    </div>
  );
}

OverlayCard.Header = Header;
OverlayCard.Footer = Footer;
OverlayCard.Body = Body;
