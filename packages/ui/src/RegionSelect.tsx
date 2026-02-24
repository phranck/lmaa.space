import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuChevronDown, LuInfo, LuX } from "react-icons/lu";

export const REGION_OPTIONS = [
  { code: "DE", flag: "🇩🇪", name: "Deutschland" },
  { code: "AT", flag: "🇦🇹", name: "Österreich" },
  { code: "CH", flag: "🇨🇭", name: "Schweiz" },
  { code: "EU", flag: "🇪🇺", name: "Europa" },
] as const;

export type RegionCode = (typeof REGION_OPTIONS)[number]["code"];

export interface RegionSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  buttonClassName?: string;
}

export function RegionSelect({ value, onChange, error, buttonClassName }: RegionSelectProps) {
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

  function toggle(code: string) {
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
            const opt = REGION_OPTIONS.find((o) => o.code === value[0]);
            return opt ? `${opt.flag} ${opt.name}` : value[0];
          })()
        : `${value.length} Regionen ausgewählt`;

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
            className="border border-[var(--ds-border)] rounded-lg shadow-lg overflow-hidden"
          >
            <div className="max-h-[360px] overflow-y-auto">
              {REGION_OPTIONS.map(({ code, flag, name }) => {
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

  return (
    <div>
      {/* Label + Info Popover */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">Region</span>

        <PopoverPrimitive.Root>
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] transition-colors"
              aria-label="Info zur Regionauswahl"
            >
              <LuInfo size={13} />
            </button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="bottom"
              align="start"
              sideOffset={6}
              style={{ zIndex: 9999 }}
              className="w-[276px] rounded-lg border border-black/[.175] bg-[var(--ds-surface)] shadow-md outline-none dark:border-white/[.15]"
              onEscapeKeyDown={(e) => e.stopPropagation()}
            >
              {/* Popover header */}
              <div className="flex items-center justify-between px-4 py-2 bg-[var(--ds-bg)] border-b border-black/[.1] rounded-t-lg dark:border-white/[.1]">
                <span className="font-semibold text-sm text-[var(--ds-text)]">
                  Was bedeutet Region?
                </span>
                <PopoverPrimitive.Close className="text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] transition-colors">
                  <LuX size={13} />
                </PopoverPrimitive.Close>
              </div>

              {/* Popover body */}
              <div className="px-4 py-4 text-xs text-[var(--ds-text-muted)] leading-relaxed">
                Gibt an, ob dieser Shop eine eigene Website für die jeweilige Region hat. Bei
                Deutschland, Österreich und der Schweiz ist das meist an der TLD erkennbar (.de,
                .at, .ch). Bei Europa können auch .com, .biz oder andere internationale Domains
                genutzt werden.
              </div>

              {/* Arrow */}
              <PopoverPrimitive.Arrow
                width={16}
                height={8}
                className="fill-[var(--ds-bg)]"
                style={{ filter: "drop-shadow(0 -1px 0 rgba(0,0,0,0.175))" }}
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>

      {/* Trigger button */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className={`w-full flex items-center justify-between px-3 py-2 border rounded-control text-sm text-left bg-[var(--ds-input-bg)] transition-colors ${buttonClassName ?? ""} ${
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
            {label ?? "Region wählen…"}
          </span>
          <LuChevronDown
            size={14}
            className={`shrink-0 ml-2 text-[var(--ds-text-subtle)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {dropdown}
      </div>

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
