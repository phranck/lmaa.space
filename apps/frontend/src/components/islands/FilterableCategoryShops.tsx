import { useCallback, useReducer } from "react";

import { encodeShopToken, type Shop } from "@lmaa/shared";

import FilterToggleButton from "@/components/FilterToggleButton";
import ShopCardReact from "@/components/ShopCardReact";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useGridAnimation } from "@/hooks/useGridAnimation";
import { fetchJson } from "@/lib/fetch-json";
import { type ShopFilters, buildFilterQuery } from "@/lib/filter-query";

import ShopFilterBar from "./ShopFilterBar";

interface FilterableCategoryShopsProps {
  slug: string;
  categoryName: string;
  shops: Shop[];
  initialFilters: ShopFilters;
}

interface CategoryShopsState {
  showFilter: boolean;
  shops: Shop[];
  filtersActive: boolean;
  currentFilters: ShopFilters;
}

type CategoryShopsAction = Partial<CategoryShopsState>;

function categoryShopsReducer(
  state: CategoryShopsState,
  action: CategoryShopsAction,
): CategoryShopsState {
  return { ...state, ...action };
}

function hasActiveShopFilters(filters: ShopFilters): boolean {
  return filters.city !== "" || filters.country.length > 0 || filters.region.length > 0;
}

function buildShopDetailHref(shopId: number, slug: string, filters: ShopFilters): string {
  const filterQuery = buildFilterQuery(filters);
  const base = `/shop/${encodeShopToken(shopId)}?from=category&slug=${slug}`;
  return filterQuery ? `${base}&${filterQuery}` : base;
}

/**
 * React island that renders the shop list for a single category with live filter support.
 *
 * Hydrates from SSR-rendered initial shops and re-fetches on filter changes via the API.
 */
export default function FilterableCategoryShops({
  slug,
  categoryName,
  shops: initialShops,
  initialFilters,
}: FilterableCategoryShopsProps) {
  const hasInitialFilters = hasActiveShopFilters(initialFilters);
  const [{ showFilter, shops, filtersActive, currentFilters }, dispatch] = useReducer(
    categoryShopsReducer,
    {
      showFilter: hasInitialFilters,
      shops: initialShops,
      filtersActive: hasInitialFilters,
      currentFilters: initialFilters,
    },
  );
  const gridRef = useGridAnimation();

  const fetchFiltered = useCallback(
    (filters: ShopFilters) => {
      const hasFilters = hasActiveShopFilters(filters);

      dispatch({ filtersActive: hasFilters, currentFilters: filters });

      // Update URL without reload
      const query = buildFilterQuery(filters);
      const newUrl = query ? `/category/${slug}?${query}` : `/category/${slug}`;
      window.history.replaceState(null, "", newUrl);

      if (!hasFilters) {
        dispatch({ shops: initialShops });
        return;
      }

      fetchJson<{ shops: Shop[] }>(`/filtered/categories/${slug}?${query}`)
        .then((data) => {
          if (data.shops) {
            dispatch({ shops: data.shops });
          }
        })
        .catch(() => {});
    },
    [slug, initialShops],
  );

  const handleFilterChange = useDebouncedCallback(fetchFiltered);

  return (
    <>
      {/* Breadcrumb + Filter toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <nav className="flex items-center gap-1.5 text-sm text-stone-400" aria-label="Breadcrumb">
          <a href="/" className="hover:text-amber-700 transition-colors">
            Start
          </a>
          <span className="text-stone-300" aria-hidden="true">
            ›
          </span>
          <span className="text-stone-600">{categoryName}</span>
        </nav>
        <FilterToggleButton
          showFilter={showFilter}
          filtersActive={filtersActive}
          onClick={() => dispatch({ showFilter: !showFilter })}
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
            <ShopFilterBar initialFilters={currentFilters} onFilterChange={handleFilterChange} />
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
        <div ref={gridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {shops.map((shop) => (
            <ShopCardReact
              key={shop.id}
              shopId={shop.id}
              name={shop.name}
              ogImage={shop.ogImage}
              logoBackgroundColor={shop.logoBackgroundColor}
              url={shop.url}
              categories={shop.categories}
              detailHref={buildShopDetailHref(shop.id, slug, currentFilters)}
              hasCoordinates={
                shop.headquarters?.latitude != null && shop.headquarters?.longitude != null
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
