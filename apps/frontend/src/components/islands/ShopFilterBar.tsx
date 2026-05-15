import { XCircleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import { createDefaultRegionOptions, RegionSelect } from "@lmaa/ui";

import { API_BASE } from "@/lib/client-api";
import type { ShopFilters } from "@/lib/filter-query";

import CountryMultiSelect, { type FilterCountry } from "./CountryMultiSelect";

export type { ShopFilters };

const RADIUS_PRESETS = [10, 25, 50, 100, 200];

const regionOptions = createDefaultRegionOptions("de");

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

async function loadFilterCountries(signal: AbortSignal): Promise<FilterCountry[]> {
  try {
    const res = await fetch(`${API_BASE}/filter-options`, { signal });
    const json = await res.json();
    return json.data?.countries ?? [];
  } catch {
    return [];
  }
}

// -- Main Filter Bar --

/**
 * Interactive filter bar for shop lists.
 *
 * Allows filtering by city/radius (geo), country of headquarters, and shipping
 * regions. Fetches available country options from the API on mount.
 * Calls `onFilterChange` on every filter update.
 */
export default function ShopFilterBar({ initialFilters, onFilterChange }: ShopFilterBarProps) {
  const [filters, setFilters] = useState<ShopFilters>(() => parseInitialFilters(initialFilters));
  const [countries, setCountries] = useState<FilterCountry[]>([]);
  const [customRadius, setCustomRadius] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    loadFilterCountries(controller.signal).then(setCountries);
    return () => controller.abort();
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
    filters.city !== "" || filters.country.length > 0 || filters.region.length > 0;

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
        <XCircleIcon weight="duotone" className="size-5" />
      </button>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
        {/* City / PLZ */}
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filter-city" className="block text-xs font-medium text-stone-500 mb-1">
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
                <XCircleIcon weight="duotone" className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Radius */}
        <div className="w-full sm:w-auto min-w-[140px]">
          <label htmlFor="filter-radius" className="block text-xs font-medium text-stone-500 mb-1">
            Umkreis (km)
          </label>
          <div className="flex gap-1.5">
            <select
              id="filter-radius"
              value={RADIUS_PRESETS.includes(filters.radius) ? filters.radius : "custom"}
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
          <label htmlFor="filter-country" className="block text-xs font-medium text-stone-500 mb-1">
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
          <label htmlFor="filter-region" className="block text-xs font-medium text-stone-500 mb-1">
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
