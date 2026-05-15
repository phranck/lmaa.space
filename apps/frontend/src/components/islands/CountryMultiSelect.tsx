import { CaretDownIcon, CaretUpIcon, CheckIcon, XCircleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const REGION_NAMES = new Intl.DisplayNames(["de"], { type: "region" });

export interface FilterCountry {
  code: string;
  name: string;
}

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function countryName(code: string): string {
  return REGION_NAMES.of(code) ?? code;
}

interface CountryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: FilterCountry[];
}

export default function CountryMultiSelect({ value, onChange, options }: CountryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !portalRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

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
    if (!open && btnRef.current) {
      setRect(btnRef.current.getBoundingClientRect());
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
      : value.length <= 2
        ? value.map((code) => `${countryFlag(code)} ${countryName(code)}`).join(", ")
        : `${value.length} Lander`;

  const dropdown =
    open && rect ? (
      <div
        ref={portalRef}
        style={{
          position: "fixed",
          top: rect.bottom + 4,
          left: rect.left,
          minWidth: Math.max(rect.width, 220),
          zIndex: 40,
          backgroundColor: "var(--ds-surface)",
        }}
        className="border border-[var(--ds-border)] rounded-control shadow-lg overflow-hidden"
      >
        <div className="max-h-[300px] overflow-y-auto">
          {options.map(({ code }) => {
            const checked = value.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggle(code)}
                className={`w-full flex items-center px-3 py-1.5 text-sm text-left transition-colors hover:bg-[var(--ds-bg-elevated)] ${
                  checked
                    ? "bg-[var(--color-primary)]/5 text-[var(--ds-text)]"
                    : "text-[var(--ds-text-muted)]"
                }`}
              >
                <span
                  className={`size-4 shrink-0 flex items-center justify-center rounded border transition-colors mr-3 ${
                    checked
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                      : "border-[var(--ds-border-strong)]"
                  }`}
                >
                  {checked && <CheckIcon weight="bold" className="size-2.5 text-white" />}
                </span>
                <span className="mr-2">{countryFlag(code)}</span>
                <span className="whitespace-nowrap">{countryName(code)}</span>
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-3 py-1.5 border rounded-control text-sm text-left bg-[var(--ds-input-bg)] transition-colors h-9 rounded-lg border-stone-300 bg-white hover:border-stone-400 ${
          open ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20" : ""
        }`}
      >
        <span
          className={`truncate ${label ? "text-[var(--ds-text)]" : "text-[var(--ds-text-subtle)]"}`}
        >
          {label ?? "Alle"}
        </span>
        <div className="flex items-center shrink-0 ml-2 gap-0.5">
          {value.length > 0 && (
            <>
              <button
                type="button"
                className="cursor-pointer text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] p-0.5"
                aria-label="Auswahl aufheben"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
              >
                <XCircleIcon weight="duotone" className="size-4" />
              </button>
              <div className="w-px h-4 bg-[var(--ds-border)] mx-0.5" />
            </>
          )}
          {open ? (
            <CaretUpIcon
              weight="duotone"
              className="shrink-0 ml-2 size-4 text-[var(--ds-text-subtle)]"
            />
          ) : (
            <CaretDownIcon
              weight="duotone"
              className="shrink-0 ml-2 size-4 text-[var(--ds-text-subtle)]"
            />
          )}
        </div>
      </button>
      {typeof document !== "undefined" && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
