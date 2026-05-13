import { XCircleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";

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

  const pickerColor = value ?? fallback;
  const canReset = value !== null && !disabled;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
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
      {open && !disabled ? (
        <div
          className="absolute left-0 top-full z-50 mt-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3 shadow-lg"
          role="dialog"
          aria-label={ariaLabel}
        >
          <HexAlphaColorPicker color={pickerColor} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
