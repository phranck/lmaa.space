import { REGION_CODES, type RegionCode } from "@lmaa/shared";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuChevronDown, LuInfo } from "react-icons/lu";

/**
 * Display option used by region select inputs.
 */
export interface RegionSelectOption {
  code: RegionCode;
  flag: string;
  name: string;
}

/**
 * Localizable copy contract for the region select component.
 */
export interface RegionSelectMessages {
  label: string;
  placeholder: string;
  infoAriaLabel: string;
  infoTitle: string;
  infoDescription: string;
}

/**
 * Flag mapping keyed by {@link RegionCode}.
 */
export const REGION_FLAGS: Readonly<Record<RegionCode, string>> = {
  DE: "🇩🇪",
  AT: "🇦🇹",
  CH: "🇨🇭",
  EU: "🇪🇺",
};

/**
 * Creates region options from translated names while keeping canonical region order.
 *
 * @param regionNames Region label mapping keyed by `RegionCode`.
 * @returns Ordered list of options with flag + translated name.
 */
export function createRegionOptions(
  regionNames: Readonly<Record<RegionCode, string>>,
): ReadonlyArray<RegionSelectOption> {
  return REGION_CODES.map((code) => ({ code, flag: REGION_FLAGS[code], name: regionNames[code] }));
}

/**
 * Re-export of shared `RegionCode` union for UI consumers.
 */
export type { RegionCode };

/**
 * Props for the shared region select component.
 */
export interface RegionSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: ReadonlyArray<RegionSelectOption>;
  messages: RegionSelectMessages;
  error?: string;
  buttonClassName?: string;
  variant?: "dashboard" | "frontend";
}

/**
 * Region multi-select input with portal dropdown and optional info popover.
 */
export function RegionSelect({
  value,
  onChange,
  options,
  messages,
  error,
  buttonClassName,
  variant = "dashboard",
}: RegionSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = buttonRef.current?.contains(target) ?? false;
      const insidePortal = portalRef.current?.contains(target) ?? false;
      if (!insideButton && !insidePortal) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // ESC closes dropdown before ShopEditCard ESC handler
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    if (open) window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      setDropdownRect(buttonRef.current.getBoundingClientRect());
    }
    setOpen((o) => !o);
  }

  function toggle(code: RegionCode) {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  }

  const label =
    value.length === 0
      ? null
      : value.length === 1
        ? (() => {
            const opt = options.find((o) => o.code === value[0]);
            return opt ? `${opt.flag} ${opt.name}` : value[0];
          })()
        : value.map((code) => options.find((o) => o.code === code)?.flag ?? code).join("  ");

  const dropdown =
    open && dropdownRect
      ? createPortal(
          <div
            ref={portalRef}
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
            <div className="max-h-[360px] overflow-y-auto">
              {options.map(({ code, flag, name }) => {
                const checked = value.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggle(code)}
                    className={`w-full flex items-center px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--ds-bg-elevated)] ${
                      checked
                        ? "bg-[var(--color-primary)]/5 text-[var(--ds-text)]"
                        : "text-[var(--ds-text-muted)]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors mr-3 ${
                        checked
                          ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                          : "border-[var(--ds-border-strong)]"
                      }`}
                    >
                      {checked && <LuCheck size={10} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="mr-1.5">{flag}</span>
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  const labelClass =
    variant === "frontend"
      ? "block text-sm font-medium text-stone-700 mb-1.5"
      : "block text-xs font-medium text-[var(--ds-text-muted)] mb-1";

  return (
    <div>
      <span className={labelClass}>{messages.label}</span>

      {/* Trigger button + Info button */}
      <div className="flex gap-2">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className={`flex-1 flex items-center justify-between px-3 py-2 border rounded-control text-sm text-left bg-[var(--ds-input-bg)] transition-colors ${buttonClassName ?? ""} ${
            open
              ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
              : error
                ? "border-red-400"
                : "border-[var(--ds-border)] hover:border-[var(--ds-border-strong)]"
          }`}
        >
          <span
            className={`truncate ${label ? "text-[var(--ds-text)]" : "text-[var(--ds-text-subtle)]"}`}
          >
            {label ?? messages.placeholder}
          </span>
          <LuChevronDown
            size={14}
            className={`shrink-0 ml-2 text-[var(--ds-text-subtle)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <PopoverPrimitive.Root>
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              className="shrink-0 flex items-center justify-center w-9 border rounded-control transition-colors border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-bg-elevated)]"
              aria-label={messages.infoAriaLabel}
            >
              <LuInfo size={14} />
            </button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="top"
              align="center"
              sideOffset={6}
              style={{ zIndex: 9999 }}
              className="w-[276px] rounded-control border border-black/[.175] bg-[var(--ds-surface)] shadow-md outline-none dark:border-white/[.15] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150"
              onEscapeKeyDown={(e) => e.stopPropagation()}
            >
              {/* Popover header */}
              <div className="flex items-center justify-between px-4 py-2 bg-black/[.1] border-b border-black/[.15] rounded-t-lg dark:bg-white/[.1] dark:border-white/[.15]">
                <span className="font-semibold text-sm text-[var(--ds-text)]">
                  {messages.infoTitle}
                </span>
              </div>

              {/* Popover body */}
              <div className="px-4 py-4 text-xs text-[var(--ds-text-muted)] leading-relaxed">
                {messages.infoDescription}
              </div>

              {/* Arrow */}
              <PopoverPrimitive.Arrow
                width={16}
                height={8}
                className="fill-[var(--ds-surface)]"
                style={{ filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.175))" }}
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>

      {dropdown}

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
