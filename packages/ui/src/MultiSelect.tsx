// Multi-select component – API based on shadcn-multi-select-component
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { CheckIcon, ChevronDown, WandSparkles, XCircle, XIcon } from "lucide-react";
import * as React from "react";

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
  modalPopover = false,
  className,
  error,
}: MultiSelectProps) {
  const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(animation > 0);

  // Sync when parent updates defaultValue (controlled usage)
  const defaultKey = defaultValue.join(",");
  React.useEffect(() => {
    setSelectedValues(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultKey]);

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      setIsPopoverOpen(true);
    } else if (event.key === "Backspace" && !event.currentTarget.value) {
      const next = selectedValues.slice(0, -1);
      setSelectedValues(next);
      onValueChange(next);
    }
  }

  function toggleOption(optionValue: string) {
    const next = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];
    setSelectedValues(next);
    onValueChange(next);
  }

  function handleClear() {
    setSelectedValues([]);
    onValueChange([]);
  }

  function handleToggleAll() {
    if (selectedValues.length === options.length) {
      handleClear();
    } else {
      const all = options.map((o) => o.value);
      setSelectedValues(all);
      onValueChange(all);
    }
  }

  function togglePopover() {
    setIsPopoverOpen((prev) => !prev);
  }

  function clearExtraOptions() {
    const next = selectedValues.slice(0, maxCount);
    setSelectedValues(next);
    onValueChange(next);
  }

  const allSelected =
    options.length > 0 && selectedValues.length === options.length;

  return (
    <div className="relative">
      <PopoverPrimitive.Root
        open={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
        modal={modalPopover}
      >
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            onClick={togglePopover}
            className={cn(
              "w-full flex items-center justify-between min-h-10 h-auto px-3 py-1.5 border rounded-lg text-sm text-left transition-colors [&_svg]:pointer-events-auto",
              isPopoverOpen
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
                      style={{
                        animationDuration: `${animation}s`,
                        ...opt.style,
                      }}
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
                    className={cn(
                      multiSelectVariants({ variant }),
                      "cursor-pointer",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearExtraOptions();
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClear();
                      }
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
                      <WandSparkles className={cn("h-3.5 w-3.5", isAnimating ? "text-[var(--color-primary)]" : "")} />
                    </span>
                  )}
                  <div className="w-px h-4 bg-[var(--ds-border)] mx-0.5" />
                </>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 mx-0.5 text-[var(--ds-text-subtle)] transition-transform duration-200",
                  isPopoverOpen && "rotate-180",
                )}
              />
            </div>
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            style={{
              width: "var(--radix-popover-trigger-width)",
              backgroundColor: "var(--ds-input-bg, #ffffff)",
            }}
            className="z-[9999] border border-[var(--ds-border)] rounded-lg shadow-lg overflow-hidden p-0"
            align="start"
            sideOffset={4}
            onEscapeKeyDown={(e) => {
              e.stopPropagation();
            }}
          >
            <Command>
              <div className="flex items-center border-b border-[var(--ds-border)] px-3">
                {/* cmdk CommandInput styling via scoped inline style */}
                <style>{`[cmdk-input]{width:100%;padding:8px 0;font-size:.875rem;background:transparent;outline:none;border:none;color:var(--ds-text);}[cmdk-input]::placeholder{color:var(--ds-text-subtle);}`}</style>
                <CommandInput
                  placeholder="Suchen…"
                  onKeyDown={handleInputKeyDown}
                />
              </div>

              <CommandList style={{ maxHeight: "300px", overflowY: "auto" }}>
                <CommandEmpty
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    color: "var(--ds-text-subtle)",
                  }}
                >
                  Keine Ergebnisse.
                </CommandEmpty>

                <CommandGroup>
                  {/* Select all */}
                  <CommandItem
                    value="__select_all__"
                    onSelect={handleToggleAll}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer outline-none",
                      "hover:bg-[var(--ds-bg-elevated)] data-[selected=true]:bg-[var(--ds-bg-elevated)]",
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
                  </CommandItem>

                  {/* Options */}
                  {options.map((opt) => {
                    const isSelected = selectedValues.includes(opt.value);
                    return (
                      <CommandItem
                        key={opt.value}
                        value={opt.label}
                        onSelect={() => toggleOption(opt.value)}
                        disabled={opt.disabled}
                        style={opt.style}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition-colors outline-none",
                          "data-[selected=true]:bg-[var(--ds-bg-elevated)]",
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
                        {opt.icon && (
                          <opt.icon className="h-4 w-4 text-[var(--ds-text-muted)]" />
                        )}
                        {opt.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {selectedValues.length > 0 && (
                  <>
                    <CommandSeparator
                      style={{
                        borderTop: "1px solid var(--ds-border)",
                        margin: "2px 0",
                      }}
                    />
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleClear}
                        className="justify-center text-center text-sm text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-elevated)] data-[selected=true]:bg-[var(--ds-bg-elevated)] cursor-pointer py-2 outline-none"
                      >
                        Auswahl aufheben
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
