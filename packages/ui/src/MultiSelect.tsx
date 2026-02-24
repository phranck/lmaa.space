import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { CheckIcon, ChevronDown, XCircle, XIcon } from "lucide-react";
import * as React from "react";

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface MultiSelectOption {
  id: number;
  name: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  error?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Kategorie wählen…",
  error,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedSet = new Set(value);

  function toggle(id: number) {
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function toggleAll() {
    if (value.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.id));
    }
  }

  const selectedOptions = value
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is MultiSelectOption => o !== undefined);

  const allSelected = options.length > 0 && value.length === options.length;

  return (
    <div className="relative">
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full flex items-center justify-between min-h-10 h-auto px-3 py-1.5 border rounded-lg text-sm text-left bg-[var(--ds-input-bg)] transition-colors [&_svg]:pointer-events-auto",
              open
                ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
                : error
                  ? "border-red-400"
                  : "border-[var(--ds-border)] hover:border-[var(--ds-border-strong)]",
            )}
          >
            {selectedOptions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
                {selectedOptions.slice(0, 3).map((opt) => (
                  <span
                    key={opt.id}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text)] text-xs"
                  >
                    {opt.name}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(opt.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          toggle(opt.id);
                        }
                      }}
                      className="cursor-pointer text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)]"
                    >
                      <XCircle className="w-3 h-3" />
                    </div>
                  </span>
                ))}
                {selectedOptions.length > 3 && (
                  <span className="text-xs text-[var(--ds-text-muted)]">
                    +{selectedOptions.length - 3} weitere
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[var(--ds-text-subtle)]">{placeholder}</span>
            )}

            <div className="flex items-center shrink-0 ml-2 gap-0.5">
              {selectedOptions.length > 0 && (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange([]);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange([]);
                      }
                    }}
                    className="cursor-pointer text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] p-0.5"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-px h-4 bg-[var(--ds-border)] mx-0.5" />
                </>
              )}
              <ChevronDown
                className={cn(
                  "w-4 h-4 mx-0.5 text-[var(--ds-text-subtle)] transition-transform duration-200",
                  open && "rotate-180",
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
              {/* Search input */}
              <div className="flex items-center border-b border-[var(--ds-border)] px-3">
                <style>{`[cmdk-input]{width:100%;padding:8px 0;font-size:.875rem;background:transparent;outline:none;border:none;color:var(--ds-text);}[cmdk-input]::placeholder{color:var(--ds-text-subtle);}`}</style>
                <CommandInput placeholder="Suchen…" />
              </div>

              <CommandList
                style={{ maxHeight: "300px", overflowY: "auto" }}
              >
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
                  {/* Select All */}
                  <CommandItem
                    value="__all__"
                    onSelect={toggleAll}
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
                        <CheckIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      )}
                    </span>
                    <span className="text-[var(--ds-text)]">(Alle auswählen)</span>
                  </CommandItem>

                  {/* Options */}
                  {options.map((opt) => {
                    const checked = selectedSet.has(opt.id);
                    return (
                      <CommandItem
                        key={opt.id}
                        value={opt.name}
                        onSelect={() => toggle(opt.id)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition-colors outline-none",
                          "data-[selected=true]:bg-[var(--ds-bg-elevated)]",
                          checked
                            ? "text-[var(--ds-text)]"
                            : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-elevated)]",
                        )}
                      >
                        <span
                          className={cn(
                            "w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors",
                            checked
                              ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                              : "border-[var(--ds-border-strong)]",
                          )}
                        >
                          {checked && (
                            <CheckIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          )}
                        </span>
                        {opt.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {value.length > 0 && (
                  <>
                    <CommandSeparator
                      style={{
                        borderTop: "1px solid var(--ds-border)",
                        margin: "2px 0",
                      }}
                    />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => onChange([])}
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
