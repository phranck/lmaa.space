// Multi-select component
// API based on shadcn-multi-select-component
// Dropdown implemented via createPortal (same approach as RegionSelect)
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDown, WandSparkles, XCircle, XIcon } from "lucide-react";
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
  onValueChange: (value: string[]) => void;
  defaultValue?: string[];
  placeholder?: string;
  animation?: number;
  maxCount?: number;
  modalPopover?: boolean;
  className?: string;
  error?: string;
}

export function MultiSelect({
  options,
  onValueChange,
  variant,
  defaultValue = [],
  placeholder = "Auswählen…",
  animation = 0,
  maxCount = 3,
  className,
  error,
}: MultiSelectProps) {
  const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue);
  const [isOpen, setIsOpen] = React.useState(false);
  const [dropdownRect, setDropdownRect] = React.useState<DOMRect | null>(null);
  const [search, setSearch] = React.useState("");
  const [isAnimating, setIsAnimating] = React.useState(animation > 0);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Sync when parent updates defaultValue (controlled usage)
  const defaultKey = defaultValue.join(",");
  React.useEffect(() => {
    setSelectedValues(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultKey]);

  // Close on click outside
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setSearch("");
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
        setSearch("");
      }
    }
    if (isOpen) window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [isOpen]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [isOpen]);

  function handleToggle() {
    if (!isOpen && triggerRef.current) {
      setDropdownRect(triggerRef.current.getBoundingClientRect());
    }
    setIsOpen((prev) => !prev);
    if (isOpen) setSearch("");
  }

  function toggleOption(optionValue: string) {
    const next = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];
    setSelectedValues(next);
    onValueChange(next);
  }

  function handleClear(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    setSelectedValues([]);
    onValueChange([]);
  }

  function handleToggleAll() {
    const all = options.map((o) => o.value);
    if (selectedValues.length === options.length) {
      setSelectedValues([]);
      onValueChange([]);
    } else {
      setSelectedValues(all);
      onValueChange(all);
    }
  }

  function clearExtraOptions(e: React.MouseEvent) {
    e.stopPropagation();
    const next = selectedValues.slice(0, maxCount);
    setSelectedValues(next);
    onValueChange(next);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !search) {
      const next = selectedValues.slice(0, -1);
      setSelectedValues(next);
      onValueChange(next);
    }
  }

  const filteredOptions = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  const allSelected = options.length > 0 && selectedValues.length === options.length;

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
            className="border border-[var(--ds-border)] rounded-lg shadow-lg overflow-hidden"
          >
            {/* Search */}
            <div className="flex items-center border-b border-[var(--ds-border)] px-3">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Suchen…"
                className="w-full py-2 text-sm bg-transparent outline-none border-none"
                style={{ color: "var(--ds-text)" }}
              />
            </div>

            {/* List */}
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {filteredOptions.length === 0 && (
                <div
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    color: "var(--ds-text-subtle)",
                  }}
                >
                  Keine Ergebnisse.
                </div>
              )}

              {/* Select all (only when not searching) */}
              {!search && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors outline-none",
                    "hover:bg-[var(--ds-bg-elevated)]",
                  )}
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
              )}

              {/* Options */}
              {filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    disabled={opt.disabled}
                    style={opt.style}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors outline-none",
                      isSelected
                        ? "text-[var(--ds-text)]"
                        : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-elevated)]",
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

              {/* Clear selection */}
              {selectedValues.length > 0 && (
                <>
                  <div
                    style={{ borderTop: "1px solid var(--ds-border)", margin: "2px 0" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedValues([]);
                      onValueChange([]);
                    }}
                    className="w-full py-2 text-sm text-center text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-elevated)] transition-colors"
                  >
                    Auswahl aufheben
                  </button>
                </>
              )}
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
          "w-full flex items-center justify-between min-h-10 h-auto px-3 py-1.5 border rounded-lg text-sm text-left transition-colors [&_svg]:pointer-events-auto",
          isOpen
            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
            : error
              ? "border-red-400"
              : "border-[var(--ds-border)] hover:border-[var(--ds-border-strong)]",
          className,
        )}
        style={{ backgroundColor: "var(--ds-input-bg, #ffffff)" }}
      >
        {selectedValues.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
            {selectedValues.slice(0, maxCount).map((val) => {
              const opt = options.find((o) => o.value === val);
              if (!opt) return null;
              return (
                <span
                  key={val}
                  className={cn(
                    multiSelectVariants({ variant }),
                    isAnimating ? "animate-bounce" : "",
                  )}
                  style={{ animationDuration: `${animation}s`, ...opt.style }}
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
            {selectedValues.length > maxCount && (
              <span
                className={cn(multiSelectVariants({ variant }), "cursor-pointer")}
                onClick={clearExtraOptions}
              >
                {`+ ${selectedValues.length - maxCount} weitere`}
                <XCircle className="h-3 w-3 opacity-60" />
              </span>
            )}
          </div>
        ) : (
          <span className="text-[var(--ds-text-subtle)]">{placeholder}</span>
        )}

        <div className="flex items-center shrink-0 ml-2 gap-0.5">
          {selectedValues.length > 0 && (
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
              {animation > 0 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAnimating(!isAnimating);
                  }}
                  className="cursor-pointer text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] p-0.5"
                >
                  <WandSparkles
                    className={cn(
                      "h-3.5 w-3.5",
                      isAnimating ? "text-[var(--color-primary)]" : "",
                    )}
                  />
                </span>
              )}
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
