import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useCallback, useRef, useState } from "react";

import { encodeShopToken, type Shop } from "@lmaa/shared";

import FilterToggleButton from "@/components/FilterToggleButton";
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
  const [gridRef] = useAutoAnimate({ duration: 250, easing: "ease-out" });

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
        <FilterToggleButton
          showFilter={showFilter}
          filtersActive={filtersActive}
          onClick={() => setShowFilter((v) => !v)}
        />
      </div>

      {/* Filter bar */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          showFilter ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mb-6">
            <ShopFilterBar
              initialFilters={currentFilters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>
      </div>

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
        <div ref={gridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {shops.map((shop) => (
            <ShopCardReact
              key={shop.id}
              name={shop.name}
              ogImage={shop.ogImage}
              url={shop.url}
              categories={shop.categories}
              detailHref={buildShopDetailHref(shop.id, slug, currentFilters)}
              hasCoordinates={shop.headquarters?.latitude != null && shop.headquarters?.longitude != null}
            />
          ))}
        </div>
      )}
    </>
  );
}
