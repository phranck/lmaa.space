import { useCallback, useRef, useState } from "react";

import { encodeShopToken, type Shop } from "@lmaa/shared";

import ShopCardReact from "@/components/ShopCardReact";
import { API_BASE } from "@/lib/client-api";
import { type ShopFilters, buildFilterQuery } from "@/lib/filter-query";

import ShopFilterBar from "./ShopFilterBar";

interface FilterableCategoryShopsProps {
  slug: string;
  shops: Shop[];
  initialFilters: ShopFilters;
}

function buildShopDetailHref(
  shopId: number,
  slug: string,
  filters: ShopFilters,
): string {
  const filterQuery = buildFilterQuery(filters);
  const base = `/shop/${encodeShopToken(shopId)}?from=category&slug=${slug}`;
  return filterQuery ? `${base}&${filterQuery}` : base;
}

export default function FilterableCategoryShops({
  slug,
  shops: initialShops,
  initialFilters,
}: FilterableCategoryShopsProps) {
  const hasInitialFilters =
    initialFilters.city !== "" ||
    initialFilters.country !== "" ||
    initialFilters.region.length > 0;

  const [showFilter, setShowFilter] = useState(hasInitialFilters);
  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [filtersActive, setFiltersActive] = useState(hasInitialFilters);
  const [currentFilters, setCurrentFilters] =
    useState<ShopFilters>(initialFilters);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchFiltered = useCallback(
    (filters: ShopFilters) => {
      const hasFilters =
        filters.city !== "" ||
        filters.country !== "" ||
        filters.region.length > 0;

      setFiltersActive(hasFilters);
      setCurrentFilters(filters);

      // Update URL without reload
      const query = buildFilterQuery(filters);
      const newUrl = query ? `/category/${slug}?${query}` : `/category/${slug}`;
      window.history.replaceState(null, "", newUrl);

      if (!hasFilters) {
        setShops(initialShops);
        return;
      }

      fetch(`${API_BASE}/filtered/categories/${slug}?${query}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.data?.shops) {
            setShops(json.data.shops as Shop[]);
          }
        })
        .catch(() => {});
    },
    [slug, initialShops],
  );

  const handleFilterChange = useCallback(
    (filters: ShopFilters) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchFiltered(filters), 400);
    },
    [fetchFiltered],
  );

  return (
    <>
      {/* Filter toggle */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowFilter((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            showFilter || filtersActive
              ? "bg-amber-100 border-amber-300 text-amber-800"
              : "bg-white border-stone-300 text-stone-500 hover:border-stone-400"
          }`}
          aria-expanded={showFilter}
          aria-label="Filter ein-/ausblenden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            className="w-4 h-4"
            fill="currentColor"
          >
            <path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z" />
          </svg>
          Filter
        </button>
      </div>

      {/* Filter bar */}
      {showFilter && (
        <div className="mb-6">
          <ShopFilterBar
            initialFilters={currentFilters}
            onFilterChange={handleFilterChange}
          />
        </div>
      )}

      {/* Shop grid */}
      {shops.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-100">
          <p className="text-stone-500">
            {filtersActive
              ? "Keine Shops in dieser Kategorie für diesen Filter gefunden."
              : "Noch keine Shops in dieser Kategorie."}
          </p>
          {!filtersActive && (
            <a
              href="/suggestion"
              className="inline-block mt-5 px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Ersten Shop vorschlagen
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {shops.map((shop) => (
            <ShopCardReact
              key={shop.id}
              name={shop.name}
              ogImage={shop.ogImage}
              url={shop.url}
              categories={shop.categories}
              detailHref={buildShopDetailHref(shop.id, slug, currentFilters)}
            />
          ))}
        </div>
      )}
    </>
  );
}
