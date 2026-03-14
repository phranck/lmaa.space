import { useCallback, useEffect, useState } from "react";

import { REGION_CODES } from "@lmaa/shared";

import { API_BASE } from "@/lib/client-api";

const RADIUS_PRESETS = [10, 25, 50, 100, 200];

const REGION_LABELS: Record<string, string> = {
  DE: "\u{1F1E9}\u{1F1EA}",
  AT: "\u{1F1E6}\u{1F1F9}",
  CH: "\u{1F1E8}\u{1F1ED}",
  EU: "\u{1F1EA}\u{1F1FA}",
  WORLD: "\u{1F30D}",
};

export interface ShopFilters {
  city: string;
  radius: number;
  country: string;
  region: string[];
}

interface FilterOption {
  code: string;
  name: string;
}

interface ShopFilterBarProps {
  initialFilters?: Partial<ShopFilters>;
  onFilterChange: (filters: ShopFilters) => void;
}

function parseInitialFilters(init?: Partial<ShopFilters>): ShopFilters {
  return {
    city: init?.city ?? "",
    radius: init?.radius ?? 50,
    country: init?.country ?? "",
    region: init?.region ?? [],
  };
}

export default function ShopFilterBar({
  initialFilters,
  onFilterChange,
}: ShopFilterBarProps) {
  const [filters, setFilters] = useState<ShopFilters>(() =>
    parseInitialFilters(initialFilters),
  );
  const [countries, setCountries] = useState<FilterOption[]>([]);
  const [customRadius, setCustomRadius] = useState("");

  // Fetch available countries
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

  const toggleRegion = useCallback(
    (code: string) => {
      setFilters((prev) => {
        const next = prev.region.includes(code)
          ? prev.region.filter((r) => r !== code)
          : [...prev.region, code];
        const updated = { ...prev, region: next };
        onFilterChange(updated);
        return updated;
      });
    },
    [onFilterChange],
  );

  const reset = useCallback(() => {
    const empty: ShopFilters = { city: "", radius: 50, country: "", region: [] };
    setFilters(empty);
    setCustomRadius("");
    onFilterChange(empty);
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.city !== "" ||
    filters.country !== "" ||
    filters.region.length > 0;

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
        {/* City / PLZ */}
        <div className="flex-1 min-w-[180px]">
          <label
            htmlFor="filter-city"
            className="block text-xs font-medium text-stone-500 mb-1"
          >
            Stadt / PLZ
          </label>
          <input
            id="filter-city"
            type="text"
            value={filters.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="z.B. Berlin, 10115"
            className="w-full h-9 px-3 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
          />
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

        {/* Country */}
        <div className="w-full sm:w-auto min-w-[140px]">
          <label
            htmlFor="filter-country"
            className="block text-xs font-medium text-stone-500 mb-1"
          >
            Land (Sitz)
          </label>
          <select
            id="filter-country"
            value={filters.country}
            onChange={(e) => update({ country: e.target.value })}
            className="w-full h-9 px-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
          >
            <option value="">Alle</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name || c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Region pills */}
        <div className="w-full sm:w-auto">
          <span className="block text-xs font-medium text-stone-500 mb-1">
            Versand
          </span>
          <div className="flex flex-wrap gap-1.5">
            {REGION_CODES.map((code) => {
              const active = filters.region.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleRegion(code)}
                  className={`h-9 px-3 rounded-lg text-sm font-medium border transition-all ${
                    active
                      ? "bg-amber-100 border-amber-300 text-amber-800"
                      : "bg-white border-stone-300 text-stone-500 hover:border-stone-400"
                  }`}
                  title={code}
                >
                  {REGION_LABELS[code] ?? code}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}
