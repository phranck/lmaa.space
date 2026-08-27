import { useCallback, useReducer, useState } from "react";

import type { Category } from "@lmaa/shared";

import CategoryCard from "@/components/CategoryCard";
import FilterToggleButton from "@/components/FilterToggleButton";
import SupportPromptSlot from "@/components/islands/SupportPromptSlot";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useGridAnimation } from "@/hooks/useGridAnimation";
import { fetchJson } from "@/lib/fetch-json";
import {
  type ShopFilters,
  buildCategoryHref,
  buildFilterQuery,
} from "@/lib/filter-query";
import type { SupportPromptSlotData } from "@/lib/support-prompts";

import ShopFilterBar from "./ShopFilterBar";

interface FilterableCategoryGridProps {
  /** SSR-rendered categories (initial state, no filters). */
  categories: Category[];
  /** Total shop count (from /api/stats). */
  shopCount: number;
  /** Submissions awaiting moderation (from /api/stats). */
  pendingReviewCount: number;
  /**
   * The prompts for this page, already rendered on the server.
   *
   * Handed to the grid rather than placed under it, because the ask belongs in
   * the flow between the cards. Absent where a page carries no ask.
   */
  supportPrompts?: SupportPromptSlotData;
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
interface FilterGridState {
  showFilter: boolean;
  categories: FilteredCategory[];
  shopCount: number;
  filtersActive: boolean;
  currentFilters: ShopFilters;
}

type FilterGridAction = Partial<FilterGridState>;

function filterGridReducer(state: FilterGridState, action: FilterGridAction): FilterGridState {
  return { ...state, ...action };
}

function mapInitialCategories(cats: Category[]): FilteredCategory[] {
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl ?? null,
    imagePhotographer: c.imagePhotographer ?? null,
    imagePhotographerUrl: c.imagePhotographerUrl ?? null,
    imageFocalPointY: c.imageFocalPointY ?? 50,
    shopCount: c.shopCount ?? 0,
  }));
}

export default function FilterableCategoryGrid({
  categories: initialCategories,
  shopCount: initialShopCount,
  pendingReviewCount,
  supportPrompts,
}: FilterableCategoryGridProps) {
  const [state, dispatch] = useReducer(filterGridReducer, {
    showFilter: false,
    categories: mapInitialCategories(initialCategories),
    shopCount: initialShopCount,
    filtersActive: false,
    currentFilters: { city: "", radius: 50, country: [], region: [] },
  });
  const { showFilter, categories, shopCount, filtersActive, currentFilters } = state;
  // The grid animates once the reader has filtered, and not before. Until then
  // the only thing that changes the list is the support prompt arriving on its
  // own, and animating that would move every card on the page for something
  // that has nothing to do with them.
  const [hasFiltered, setHasFiltered] = useState(false);
  const gridRef = useGridAnimation(hasFiltered);

  const fetchFiltered = useCallback((filters: ShopFilters) => {
    const hasFilters =
      filters.city !== "" || filters.country.length > 0 || filters.region.length > 0;

    setHasFiltered(true);
    dispatch({ filtersActive: hasFilters, currentFilters: filters });

    if (!hasFilters) {
      dispatch({
        categories: mapInitialCategories(initialCategories),
        shopCount: initialShopCount,
      });
      return;
    }

    const query = buildFilterQuery(filters);
    fetchJson<{ categories: FilteredCategory[]; totalShops: number }>(
      `/filtered/categories?${query}`,
    )
      .then((result) => {
        dispatch({ categories: result.categories, shopCount: result.totalShops });
      })
      .catch(() => {});
  }, [initialCategories, initialShopCount]);

  const handleFilterChange = useDebouncedCallback(fetchFiltered);

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
            {pendingReviewCount > 0 ? ` · ${pendingReviewCount} in Review` : ""}
          </span>
          <FilterToggleButton
            showFilter={showFilter}
            filtersActive={filtersActive}
            onClick={() => dispatch({ showFilter: !showFilter })}
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
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
        >
          {/* In the flow between the cards rather than under them, given the
              second row outright so it lands after the first however many
              columns the window allows. */}
          {supportPrompts && (
            <SupportPromptSlot
              slot="category-grid"
              // A little air above and below, beyond the grid's own gap. The
              // prompt is not one of the cards and reads better for standing
              // slightly apart from the rows it sits between.
              className="col-start-1 col-end-[-1] row-start-2 my-2 sm:my-3"
              {...supportPrompts}
            />
          )}
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
