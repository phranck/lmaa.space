import { XCircleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { createPortal } from "react-dom";

export interface DashboardColorInputProps {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  fallback?: string;
  onChange: (next: string | null) => void;
  placeholder?: string;
  resetLabel?: string;
  value: string | null;
}

/** The air between the field and the panel below it, in pixels. */
const PANEL_GAP = 8;

const CHECKERBOARD_BACKGROUND =
  "linear-gradient(45deg, rgba(0,0,0,0.15) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.15) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.15) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.15) 75%)";

const HEX_FIELD_CLASS =
  "box-border h-full w-full rounded-full border-0 bg-transparent pl-2 pr-8 font-mono text-sm text-[var(--ds-text)] transition-colors placeholder:text-[var(--ds-text-subtle)] focus:outline-none disabled:cursor-not-allowed";

export function DashboardColorInput({
  ariaLabel,
  className,
  disabled = false,
  fallback = "#ffffff",
  onChange,
  placeholder = "#ffffff",
  resetLabel,
  value,
}: DashboardColorInputProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDialogElement>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);

  const pickerColor = value ?? fallback;
  const canReset = value !== null && !disabled;

  // The panel is drawn on `document.body` rather than beside the field,
  // because the section it sits in animates its own height through
  // `overflow: hidden`, and a clipped ancestor cuts a descendant whatever its
  // position. Leaving the subtree is the only cure. What that costs is this
  // measurement: the panel no longer follows its trigger by itself, so the
  // trigger's rectangle is read here and read again whenever it can move.
  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }

    function place() {
      const feld = rootRef.current;
      if (!feld) return;
      const kante = feld.getBoundingClientRect();
      setAnchor({ left: kante.left, top: kante.bottom + PANEL_GAP });
    }

    place();
    // Capture, so a scroll inside any pane moves the panel and not just one on
    // the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inField = rootRef.current?.contains(target) ?? false;
      // The panel is no longer inside the field, so it has to be asked
      // separately or the first click on a colour would close it.
      const inPanel = panelRef.current?.contains(target) ?? false;
      if (!inField && !inPanel) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-flex items-center ${className ?? ""}`}>
      <div
        className={`relative inline-flex h-[var(--ds-control-h-field)] w-44 items-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-form-control-bg,var(--ds-input-bg))] p-[3px] transition-colors focus-within:border-[var(--ds-border-focus)] focus-within:ring-2 focus-within:ring-[var(--ds-focus-ring)] ${
          disabled
            ? "cursor-not-allowed opacity-[var(--ds-control-disabled-opacity)]"
            : "hover:border-[var(--ds-border-strong)]"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={open}
          className="relative size-[calc(var(--ds-control-h-field)-6px)] shrink-0 rounded-full border border-[#222222] bg-[#cccccc] p-[2px] transition-colors focus:outline-none disabled:cursor-not-allowed"
        >
          <span
            aria-hidden="true"
            className="relative block size-full overflow-hidden rounded-full"
            style={{
              backgroundImage: CHECKERBOARD_BACKGROUND,
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
            }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{ backgroundColor: pickerColor }}
            />
          </span>
        </button>
        <div className="relative min-w-0 flex-1 self-stretch">
          <HexColorInput
            color={value ?? ""}
            onChange={(next) => onChange(next.length > 0 ? next : null)}
            alpha
            prefixed
            placeholder={placeholder}
            disabled={disabled}
            aria-label={ariaLabel}
            className={HEX_FIELD_CLASS}
          />
          {canReset ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={resetLabel}
              title={resetLabel}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] transition-colors hover:text-[var(--ds-text)] focus:outline-none focus:text-[var(--ds-text)]"
            >
              <XCircleIcon weight="duotone" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      {open && !disabled && anchor
        ? createPortal(
            <dialog
              ref={panelRef}
              open
              className="fixed z-50 m-0 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3 shadow-lg"
              style={{ left: anchor.left, top: anchor.top }}
              aria-label={ariaLabel}
            >
              <HexAlphaColorPicker color={pickerColor} onChange={onChange} />
            </dialog>,
            document.body,
          )
        : null}
    </div>
  );
}
