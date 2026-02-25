// Multi-select component
// API based on shadcn-multi-select-component
// Dropdown implemented via createPortal (same approach as RegionSelect)
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDown, XCircle, XIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const multiSelectVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-primary)] text-white",
        secondary:
          "border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text)]",
        destructive:
          "border-transparent bg-red-500 text-white",
        inverted:
          "border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

export interface MultiSelectOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export interface MultiSelectProps
  extends VariantProps<typeof multiSelectVariants> {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  maxCount?: number;
  modalPopover?: boolean;
  className?: string;
  error?: string;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  variant,
  placeholder = "Auswählen…",
  maxCount = 3,
  className,
  error,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dropdownRect, setDropdownRect] = React.useState<DOMRect | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  // Close on ESC (with stopPropagation so parent dialogs don't close)
  React.useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    }
    if (isOpen) window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [isOpen]);

  function handleToggle() {
    if (!isOpen && triggerRef.current) {
      setDropdownRect(triggerRef.current.getBoundingClientRect());
    }
    setIsOpen((prev) => !prev);
  }

  function toggleOption(optionValue: string) {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange(next);
  }

  function handleClear(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    onValueChange([]);
  }

  function handleToggleAll() {
    const all = options.map((o) => o.value);
    if (value.length === options.length) {
      onValueChange([]);
    } else {
      onValueChange(all);
    }
  }

  function clearExtraOptions(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange(value.slice(0, maxCount));
  }

  const allSelected = options.length > 0 && value.length === options.length;

  const dropdown =
    isOpen && dropdownRect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownRect.bottom + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
              backgroundColor: "var(--ds-input-bg, #ffffff)",
            }}
            className="border border-[var(--ds-border)] rounded-control shadow-lg overflow-hidden"
          >
            {/* List */}
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {/* Select all */}
              <button
                type="button"
                onClick={handleToggleAll}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors outline-none hover:bg-[var(--ds-bg-elevated)]"
              >
                <span
                  className={cn(
                    "w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors",
                    allSelected
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                      : "border-[var(--ds-border-strong)] opacity-50",
                  )}
                >
                  {allSelected && (
                    <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  )}
                </span>
                <span className="text-[var(--ds-text)]">(Alle auswählen)</span>
              </button>

              {/* Options */}
              {options.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    disabled={opt.disabled}
                    style={opt.style}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors outline-none hover:bg-[var(--ds-bg-elevated)]",
                      isSelected ? "text-[var(--ds-text)]" : "text-[var(--ds-text-muted)]",
                      opt.disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                          : "border-[var(--ds-border-strong)]",
                      )}
                    >
                      {isSelected && (
                        <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      )}
                    </span>
                    {opt.icon && <opt.icon className="h-4 w-4 text-[var(--ds-text-muted)]" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between min-h-10 h-auto px-3 py-1.5 border rounded-control text-sm text-left transition-colors [&_svg]:pointer-events-auto",
          isOpen
            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
            : error
              ? "border-red-400"
              : "border-[var(--ds-border)] hover:border-[var(--ds-border-strong)]",
          className,
        )}
        style={{ backgroundColor: "var(--ds-input-bg, #ffffff)" }}
      >
        {value.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
            {value.slice(0, maxCount).map((val) => {
              const opt = options.find((o) => o.value === val);
              if (!opt) return null;
              return (
                <span
                  key={val}
                  className={cn(multiSelectVariants({ variant }))}
                  style={opt.style}
                >
                  {opt.icon && <opt.icon className="h-3 w-3" />}
                  {opt.label}
                  <span
                    role="button"
                    aria-label={`${opt.label} entfernen`}
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleOption(val);
                      }
                    }}
                    className="cursor-pointer text-current opacity-60 hover:opacity-100"
                  >
                    <XCircle className="h-3 w-3" />
                  </span>
                </span>
              );
            })}
            {value.length > maxCount && (
              <span
                className={cn(multiSelectVariants({ variant }), "cursor-pointer")}
                onClick={clearExtraOptions}
              >
                {`+ ${value.length - maxCount} weitere`}
                <XCircle className="h-3 w-3 opacity-60" />
              </span>
            )}
          </div>
        ) : (
          <span className="text-[var(--ds-text-subtle)]">{placeholder}</span>
        )}

        <div className="flex items-center shrink-0 ml-2 gap-0.5">
          {value.length > 0 && (
            <>
              <span
                role="button"
                aria-label="Auswahl löschen"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                className="cursor-pointer text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] p-0.5"
              >
                <XIcon className="h-3.5 w-3.5" />
              </span>
              <div className="w-px h-4 bg-[var(--ds-border)] mx-0.5" />
            </>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 mx-0.5 text-[var(--ds-text-subtle)] transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {dropdown}

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
