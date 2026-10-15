import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import "./OverlayCard.css";
import {
  getOverlayStackSnapshot,
  OverlayLayerZIndexContext,
  registerOverlay,
  resolveOverlayZIndex,
  subscribeOverlayStack,
  type OverlayLayerZIndex,
} from "./overlay-stack.ts";
import { type ResizableCardSize, ResizableDialogCard } from "./ResizableDialogCard.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * How large an overlay card is: one of three fixed widths, most of the
 * window, or a card the user resizes and that keeps its size.
 */
export type OverlayCardSize =
  | "fixed-sm"
  | "fixed-md"
  | "fixed-lg"
  | "fullscreen"
  | ResizableCardSize;

export interface OverlayCardProps {
  open: boolean;
  onClose: () => void;
  size?: OverlayCardSize;
  "aria-label": string;
  className?: string;
  style?: React.CSSProperties;
  backdropClose?: boolean;
  zIndex?: OverlayLayerZIndex;
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
  size = "fixed-sm",
  "aria-label": ariaLabel,
  className,
  style,
  backdropClose = false,
  zIndex = "var(--ds-overlay-z-dialog)",
  onEscape,
  children,
}: OverlayCardProps) {
  const overlayId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const overlayIds = useSyncExternalStore(
    subscribeOverlayStack,
    getOverlayStackSnapshot,
    getOverlayStackSnapshot,
  );
  const stackIndex = overlayIds.indexOf(overlayId);
  const isRegistered = stackIndex !== -1;
  const isTopMost = isRegistered && stackIndex === overlayIds.length - 1;
  const isBaseLayer = isRegistered && stackIndex === 0;

  const startClose = useCallback(() => {
    closingRef.current = true;
    setClosing((current) => (current ? current : true));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const handler = () => {
      if (closingRef.current) return;
      if (onEscape) {
        if (onEscape() === false) return;
      }
      startClose();
    };
    return registerOverlay(overlayId, handler);
  }, [open, onEscape, overlayId, startClose]);

  // Closing gives focus to nothing, on purpose (#476). The element that opened
  // the overlay does not get it back, and the browser leaves it on the page
  // once the overlay is gone.
  useEffect(() => {
    if (!open || !isTopMost) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
  }, [open, isTopMost]);

  useEffect(() => {
    if (!open || !isTopMost) return;
    const handler = (e: KeyboardEvent) => trapFocus(e, dialogRef.current);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, isTopMost]);

  if (!open) return null;

  const handleBackdropAnimationEnd = (e: React.AnimationEvent) => {
    if (closing && e.target === e.currentTarget) {
      closingRef.current = false;
      setClosing(false);
      onClose();
    }
  };

  const handleBackdropClick = isTopMost && backdropClose && !closing ? startClose : undefined;

  const cardAnim = closing
    ? "lmaa-card-out 280ms ease forwards"
    : "lmaa-card-in 380ms ease forwards";
  const backdropAnim = closing
    ? "lmaa-overlay-out 280ms ease forwards"
    : "lmaa-overlay-in 360ms ease forwards";
  const effectiveZIndex = isRegistered ? resolveOverlayZIndex(zIndex, stackIndex * 100) : zIndex;
  const cardProps = { "aria-modal": true, "aria-label": ariaLabel };

  let card: ReactNode;
  if (typeof size === "object") {
    card = (
      <ResizableDialogCard
        ref={dialogRef}
        {...size}
        className={["flex flex-col rounded-[var(--radius-card)] shadow-2xl", className]
          .filter(Boolean)
          .join(" ")}
        style={{ animation: cardAnim, ...style }}
        {...cardProps}
      >
        {children}
      </ResizableDialogCard>
    );
  } else if (size === "fullscreen") {
    card = (
      <dialog
        open
        ref={dialogRef}
        className={[
          "relative m-0 p-0 bg-[var(--ds-surface)] border border-[rgba(255,255,255,0.06)] rounded-[var(--radius-card)] shadow-2xl flex flex-col overflow-hidden",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: "85vw", height: "85vh", animation: cardAnim, ...style }}
        {...cardProps}
      >
        {children}
      </dialog>
    );
  } else {
    const fixedMaxWidth =
      size === "fixed-lg" ? "max-w-lg" : size === "fixed-md" ? "max-w-md" : "max-w-sm";
    card = (
      <dialog
        open
        ref={dialogRef}
        className={[
          `relative m-0 p-0 bg-[var(--ds-surface)] border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-xl overflow-hidden w-full ${fixedMaxWidth}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ animation: cardAnim, ...style }}
        {...cardProps}
      >
        {children}
      </dialog>
    );
  }

  return (
    <OverlayLayerZIndexContext.Provider value={effectiveZIndex}>
      <div
        className="fixed inset-0 flex items-center justify-center px-4"
        style={{ zIndex: effectiveZIndex }}
      >
        {/* The backdrop only takes clicks. Escape closes the overlay through overlay-stack. */}
        <div
          className={[
            "absolute inset-0",
            isBaseLayer ? "backdrop-blur-xl bg-black/10" : "bg-black/20",
            isTopMost ? "pointer-events-auto" : "pointer-events-none",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ animation: backdropAnim }}
          aria-hidden="true"
          onClick={handleBackdropClick}
          onAnimationEnd={handleBackdropAnimationEnd}
        />
        {card}
      </div>
    </OverlayLayerZIndexContext.Provider>
  );
}

OverlayCard.Header = Header;
OverlayCard.Footer = Footer;
OverlayCard.Body = Body;
