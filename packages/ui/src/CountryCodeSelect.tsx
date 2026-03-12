import { CaretDownIcon, CaretUpIcon, CheckIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { formLabelClass } from "./FormPrimitives.tsx";

export interface CountryCodeOption {
  code: string;
  flag: string;
  name: string;
}

export interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<CountryCodeOption>;
  label: string;
  placeholder: string;
  error?: string;
}

const EUROPEAN_COUNTRY_CODES = [
  "AD",
  "AL",
  "AM",
  "AT",
  "AZ",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GE",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "SE",
  "SI",
  "SK",
  "SM",
  "TR",
  "UA",
  "VA",
] as const;

export function createDefaultCountryCodeOptions(
  locale: "de" | "en" = "de",
): ReadonlyArray<CountryCodeOption> {
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });

  return EUROPEAN_COUNTRY_CODES.map((code) => ({
    code,
    flag: countryFlag(code),
    name: displayNames.of(code) ?? code,
  })).sort((left, right) => left.name.localeCompare(right.name, locale));
}

export function CountryCodeSelect({
  value,
  onChange,
  options,
  label,
  placeholder,
  error,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideButton = buttonRef.current?.contains(target) ?? false;
      const insidePortal = portalRef.current?.contains(target) ?? false;
      if (!insideButton && !insidePortal) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener("keydown", onEsc, true);
    }
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      setDropdownRect(buttonRef.current.getBoundingClientRect());
    }
    setOpen((current) => !current);
  }

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
  }

  const selectedOption = options.find((option) => option.code === value);

  const dropdown =
    open && dropdownRect
      ? createPortal(
          <div
            ref={portalRef}
            style={{
              position: "fixed",
              top: dropdownRect.bottom + 4,
              left: dropdownRect.left,
              width: Math.min(Math.max(dropdownRect.width, 360), window.innerWidth - 24),
              zIndex: 9999,
              backgroundColor: "var(--ds-surface)",
            }}
            className="border border-[var(--ds-border)] rounded-control shadow-lg overflow-hidden"
          >
            <div className="max-h-[360px] overflow-y-auto">
              {options.map(({ code, flag, name }) => {
                const checked = code === value;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left transition-colors hover:bg-[var(--ds-bg-elevated)] ${
                      checked
                        ? "bg-[var(--color-primary)]/5 text-[var(--ds-text)]"
                        : "text-[var(--ds-text-muted)]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors ${
                        checked
                          ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                          : "border-[var(--ds-border-strong)]"
                      }`}
                    >
                      {checked && <CheckIcon weight="duotone" className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className="text-base leading-none">{flag}</span>
                    <span className="font-medium text-[var(--ds-text)]">{code}</span>
                    <span className="truncate">{name}</span>
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
      <span className={formLabelClass}>{label}</span>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-3 py-1.5 border rounded-control text-sm text-left bg-[var(--ds-input-bg)] transition-colors ${
          open
            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
            : error
              ? "border-[var(--ds-btn-danger-border)]"
              : "border-[var(--ds-border)] hover:border-[var(--ds-border-strong)]"
        }`}
      >
        {selectedOption ? (
          <span className="flex items-center gap-2 min-w-0 text-[var(--ds-text)]">
            <span className="text-base leading-none">{selectedOption.flag}</span>
            <span className="font-medium truncate">{selectedOption.code}</span>
          </span>
        ) : (
          <span className="truncate text-[var(--ds-text-subtle)]">{placeholder}</span>
        )}
        {open ? (
          <CaretUpIcon
            weight="duotone"
            className="shrink-0 ml-2 w-4 h-4 text-[var(--ds-text-subtle)]"
          />
        ) : (
          <CaretDownIcon
            weight="duotone"
            className="shrink-0 ml-2 w-4 h-4 text-[var(--ds-text-subtle)]"
          />
        )}
      </button>
      {dropdown}
      {error && <p className="text-[var(--ds-danger-text)] text-xs mt-1.5">{error}</p>}
    </div>
  );
}

function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return "🌐";
  }

  const offset = 127397;
  return String.fromCodePoint(
    countryCode.toUpperCase().charCodeAt(0) + offset,
    countryCode.toUpperCase().charCodeAt(1) + offset,
  );
}
