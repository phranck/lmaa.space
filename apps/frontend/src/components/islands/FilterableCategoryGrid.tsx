import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useCallback, useRef, useState } from "react";

import type { Category } from "@lmaa/shared";

import CategoryCard from "@/components/CategoryCard";
import FilterToggleButton from "@/components/FilterToggleButton";
import { API_BASE } from "@/lib/client-api";
import {
  type ShopFilters,
  buildCategoryHref,
  buildFilterQuery,
} from "@/lib/filter-query";

import ShopFilterBar from "./ShopFilterBar";

interface FilterableCategoryGridProps {
  /** SSR-rendered categories (initial state, no filters). */
  categories: Category[];
  /** Total shop count (from /api/stats). */
  shopCount: number;
}

interface FilteredCategory {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  imagePhotographer: string | null;
  imagePhotographerUrl: string | null;
  imageFocalPointY: number;
  shopCount: number;
}

/**
 * React island that renders the full category grid with geo-filter support.
 *
 * Hydrates from SSR-rendered categories and re-fetches on filter changes via the API.
 */
export default function FilterableCategoryGrid({
  categories: initialCategories,
  shopCount: initialShopCount,
}: FilterableCategoryGridProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [categories, setCategories] = useState<FilteredCategory[]>(
    initialCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl ?? null,
      imagePhotographer: c.imagePhotographer ?? null,
      imagePhotographerUrl: c.imagePhotographerUrl ?? null,
      imageFocalPointY: c.imageFocalPointY ?? 50,
      shopCount: c.shopCount ?? 0,
    })),
  );
  const [shopCount, setShopCount] = useState(initialShopCount);
  const [filtersActive, setFiltersActive] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<ShopFilters>({
    city: "",
    radius: 50,
    country: [],
    region: [],
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [gridRef] = useAutoAnimate({ duration: 250, easing: "ease-out" });

  const fetchFiltered = useCallback((filters: ShopFilters) => {
    const hasFilters =
      filters.city !== "" || filters.country.length > 0 || filters.region.length > 0;

    setFiltersActive(hasFilters);
    setCurrentFilters(filters);

    if (!hasFilters) {
      // Reset to initial data
      setCategories(
        initialCategories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          imageUrl: c.imageUrl ?? null,
          imagePhotographer: c.imagePhotographer ?? null,
          imagePhotographerUrl: c.imagePhotographerUrl ?? null,
          imageFocalPointY: c.imageFocalPointY ?? 50,
          shopCount: c.shopCount ?? 0,
        })),
      );
      setShopCount(initialShopCount);
      return;
    }

    const query = buildFilterQuery(filters);
    fetch(`${API_BASE}/filtered/categories?${query}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const filtered = json.data as FilteredCategory[];
          setCategories(filtered);
          const total = filtered.reduce((sum, c) => sum + c.shopCount, 0);
          setShopCount(total);
        }
      })
      .catch(() => {});
  }, [initialCategories, initialShopCount]);

  const handleFilterChange = useCallback(
    (filters: ShopFilters) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchFiltered(filters), 400);
    },
    [fetchFiltered],
  );

  const visibleCategories = filtersActive
    ? categories.filter((c) => c.shopCount > 0)
    : categories;

  const categoryCount = filtersActive
    ? visibleCategories.length
    : categories.length;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 pb-16">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-6 px-[15px]">
        <h2 className="font-serif text-2xl font-semibold text-stone-800 text-center sm:text-left">
          Kategorien entdecken
        </h2>
        <div className="flex items-center justify-between sm:justify-end sm:gap-4">
          <span className="text-sm text-stone-600">
            {shopCount} Shops in {categoryCount} Kategorien
          </span>
          <FilterToggleButton
            showFilter={showFilter}
            filtersActive={filtersActive}
            onClick={() => setShowFilter((v) => !v)}
          />
        </div>
      </div>

      {/* Filter bar */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
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

      {/* Category grid */}
      {visibleCategories.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-100">
          <p className="text-stone-500">
            Keine Kategorien mit Shops für diesen Filter gefunden.
          </p>
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          {visibleCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              id={cat.id}
              name={cat.name}
              slug={cat.slug}
              imageUrl={cat.imageUrl}
              imagePhotographer={cat.imagePhotographer ?? null}
              imagePhotographerUrl={cat.imagePhotographerUrl ?? null}
              imageFocalPointY={cat.imageFocalPointY}
              shopCount={cat.shopCount}
              href={buildCategoryHref(cat.slug, currentFilters)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
