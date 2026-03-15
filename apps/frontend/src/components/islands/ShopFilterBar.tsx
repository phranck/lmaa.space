import { CaretDownIcon, CaretUpIcon, CheckIcon, XCircleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { createDefaultRegionOptions, RegionSelect } from "@lmaa/ui";

import { API_BASE } from "@/lib/client-api";
import type { ShopFilters } from "@/lib/filter-query";

export type { ShopFilters };

const RADIUS_PRESETS = [10, 25, 50, 100, 200];

const regionOptions = createDefaultRegionOptions("de");

interface FilterCountry {
  code: string;
  name: string;
}

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["de"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

interface ShopFilterBarProps {
  initialFilters?: Partial<ShopFilters>;
  onFilterChange: (filters: ShopFilters) => void;
}

function parseInitialFilters(init?: Partial<ShopFilters>): ShopFilters {
  return {
    city: init?.city ?? "",
    radius: init?.radius ?? 50,
    country: init?.country ?? [],
    region: init?.region ?? [],
  };
}

// -- Country MultiSelect Dropdown --

interface CountryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: FilterCountry[];
}

function CountryMultiSelect({ value, onChange, options }: CountryMultiSelectProps) {
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
        ? value
            .map((code) => `${countryFlag(code)} ${countryName(code)}`)
            .join(", ")
        : `${value.length} Lander`;

  const dropdown =
    open && rect
      ? (
          <div
            ref={portalRef}
            style={{
              position: "fixed",
              top: rect.bottom + 4,
              left: rect.left,
              minWidth: Math.max(rect.width, 220),
              zIndex: 9999,
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
                      className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors mr-3 ${
                        checked
                          ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                          : "border-[var(--ds-border-strong)]"
                      }`}
                    >
                      {checked && <CheckIcon weight="bold" className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className="mr-2">{countryFlag(code)}</span>
                    <span className="whitespace-nowrap">{countryName(code)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      : null;

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-3 py-1.5 border rounded-control text-sm text-left bg-[var(--ds-input-bg)] transition-colors h-9 rounded-lg border-stone-300 bg-white hover:border-stone-400 ${
          open
            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
            : ""
        }`}
      >
        <span className={`truncate ${label ? "text-[var(--ds-text)]" : "text-[var(--ds-text-subtle)]"}`}>
          {label ?? "Alle"}
        </span>
        <div className="flex items-center shrink-0 ml-2 gap-0.5">
          {value.length > 0 && (
            <>
              <span
                className="cursor-pointer text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)] p-0.5"
                aria-label="Auswahl aufheben"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                onKeyDown={() => {}}
                role="button"
                tabIndex={-1}
              >
                <XCircleIcon weight="duotone" className="w-4 h-4" />
              </span>
              <div className="w-px h-4 bg-[var(--ds-border)] mx-0.5" />
            </>
          )}
          {open ? (
            <CaretUpIcon weight="duotone" className="shrink-0 ml-2 w-4 h-4 text-[var(--ds-text-subtle)]" />
          ) : (
            <CaretDownIcon weight="duotone" className="shrink-0 ml-2 w-4 h-4 text-[var(--ds-text-subtle)]" />
          )}
        </div>
      </button>
      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}


// -- Main Filter Bar --

export default function ShopFilterBar({
  initialFilters,
  onFilterChange,
}: ShopFilterBarProps) {
  const [filters, setFilters] = useState<ShopFilters>(() =>
    parseInitialFilters(initialFilters),
  );
  const [countries, setCountries] = useState<FilterCountry[]>([]);
  const [customRadius, setCustomRadius] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/filter-options`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.countries) {
          setCountries(json.data.countries);
        }
      })
      .catch(() => {});
  }, []);

  const update = useCallback(
    (patch: Partial<ShopFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        onFilterChange(next);
        return next;
      });
    },
    [onFilterChange],
  );

  const reset = useCallback(() => {
    const empty: ShopFilters = { city: "", radius: 50, country: [], region: [] };
    setFilters(empty);
    setCustomRadius("");
    onFilterChange(empty);
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.city !== "" ||
    filters.country.length > 0 ||
    filters.region.length > 0;

  return (
    <div className="relative rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
      <button
        type="button"
        onClick={reset}
        className={`absolute top-2 right-2 text-stone-300 hover:text-stone-500 transition-all duration-200 ${
          hasActiveFilters ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Filter zurucksetzen"
        title="Filter zurucksetzen"
      >
        <XCircleIcon weight="duotone" className="w-5 h-5" />
      </button>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
        {/* City / PLZ */}
        <div className="flex-1 min-w-[180px]">
          <label
            htmlFor="filter-city"
            className="block text-xs font-medium text-stone-500 mb-1"
          >
            Stadt / PLZ
          </label>
          <div className="relative">
            <input
              id="filter-city"
              type="text"
              value={filters.city}
              onChange={(e) => update({ city: e.target.value })}
              placeholder="z.B. Berlin, 10115"
              className="w-full h-9 px-3 pr-8 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            />
            {filters.city && (
              <button
                type="button"
                onClick={() => update({ city: "" })}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                aria-label="Stadt/PLZ loschen"
              >
                <XCircleIcon weight="duotone" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Radius */}
        <div className="w-full sm:w-auto min-w-[140px]">
          <label
            htmlFor="filter-radius"
            className="block text-xs font-medium text-stone-500 mb-1"
          >
            Umkreis (km)
          </label>
          <div className="flex gap-1.5">
            <select
              id="filter-radius"
              value={
                RADIUS_PRESETS.includes(filters.radius)
                  ? filters.radius
                  : "custom"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") return;
                const num = Number(val);
                setCustomRadius("");
                update({ radius: num });
              }}
              disabled={!filters.city}
              className="h-9 px-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {RADIUS_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
              {!RADIUS_PRESETS.includes(filters.radius) && (
                <option value="custom">{filters.radius} km</option>
              )}
            </select>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="km"
              value={customRadius}
              disabled={!filters.city}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setCustomRadius(raw);
                const num = Number.parseInt(raw, 10);
                if (num > 0 && num <= 500) {
                  update({ radius: num });
                }
              }}
              className="w-16 h-9 px-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>
        </div>

        {/* Country (MultiSelect) */}
        <div className="w-full sm:w-auto min-w-[180px]">
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Land (Sitz)
          </label>
          <CountryMultiSelect
            value={filters.country}
            onChange={(country) => update({ country })}
            options={countries}
          />
        </div>

        {/* Region (MultiSelect via @lmaa/ui RegionSelect) */}
        <div className="w-full sm:w-auto min-w-[180px]">
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Versand
          </label>
          <RegionSelect
            value={filters.region}
            onChange={(region) => update({ region })}
            options={regionOptions}
            messages={{ label: "", placeholder: "Alle" }}
            variant="frontend"
            buttonClassName="h-9 rounded-lg border-stone-300 bg-white hover:border-stone-400 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
