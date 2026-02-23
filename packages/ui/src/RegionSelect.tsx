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
}

export function RegionSelect({ value, onChange, error }: RegionSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

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

  // Close info on click outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!infoRef.current?.contains(target) && !infoButtonRef.current?.contains(target)) {
        setInfoOpen(false);
      }
    }
    if (infoOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [infoOpen]);

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
            }}
            className="bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-lg shadow-lg overflow-hidden"
          >
            <div className="max-h-[360px] overflow-y-auto">
              {REGION_OPTIONS.map(({ code, flag, name }) => {
                const checked = value.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggle(code)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                      checked
                        ? "bg-[var(--color-primary)]/5 text-[var(--ds-text)]"
                        : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-elevated)]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors ${
                        checked
                          ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                          : "border-[var(--ds-border-strong)]"
                      }`}
                    >
                      {checked && <LuCheck size={10} className="text-white" strokeWidth={3} />}
                    </span>
                    <span>{flag}</span>
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
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">Region</span>
        <div className="relative">
          <button
            ref={infoButtonRef}
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            className="w-4 h-4 flex items-center justify-center text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] transition-colors"
            aria-label="Info zur Regionauswahl"
          >
            <LuInfo size={13} />
          </button>
          {infoOpen && (
            <div
              ref={infoRef}
              className="absolute left-0 top-6 z-50 w-72 bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-lg shadow-lg p-3 text-xs text-[var(--ds-text-muted)] leading-relaxed"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-medium text-[var(--ds-text)]">Was bedeutet Region?</span>
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="shrink-0 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)]"
                >
                  <LuX size={12} />
                </button>
              </div>
              Gibt an, ob dieser Shop eine eigene Website für die jeweilige Region hat. Bei
              Deutschland, Österreich und der Schweiz ist das meist an der TLD erkennbar (.de, .at,
              .ch). Bei Europa können auch .com, .biz oder andere internationale Domains genutzt
              werden.
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm text-left bg-[var(--ds-surface)] transition-colors ${
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
