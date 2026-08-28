import { XCircleIcon } from "@phosphor-icons/react";
import { useCallback, useReducer } from "react";

import { encodeShopToken, type Shop } from "@lmaa/shared";

import ShopCardReact from "@/components/ShopCardReact";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useGridAnimation } from "@/hooks/useGridAnimation";
import { fetchJson } from "@/lib/fetch-json";
import { type ShopFilters, buildCategoryHref, buildFilterQuery } from "@/lib/filter-query";

import ShopFilterBar from "./ShopFilterBar";

interface CategoryResult {
  id: number;
  slug: string;
  name: string;
  shopCount?: number;
}

interface SearchResults {
  shops: Shop[];
  categories: CategoryResult[];
  total: number;
}

interface FilterableSearchResultsProps {
  initialQuery: string;
  initialResults: SearchResults;
  initialFilters: ShopFilters;
}

interface SearchResultsState {
  query: string;
  results: SearchResults;
  currentFilters: ShopFilters;
}

type SearchResultsAction =
  | { type: "query"; query: string }
  | { type: "filters"; filters: ShopFilters }
  | { type: "results"; results: SearchResults };

function searchResultsReducer(
  state: SearchResultsState,
  action: SearchResultsAction,
): SearchResultsState {
  switch (action.type) {
    case "query":
      return { ...state, query: action.query };
    case "filters":
      return { ...state, currentFilters: action.filters };
    case "results":
      return { ...state, results: action.results };
  }
}

function buildShopDetailHref(shopId: number, query: string, filters: ShopFilters): string {
  const filterQuery = buildFilterQuery(filters);
  const base = `/shop/${encodeShopToken(shopId)}?from=search&q=${encodeURIComponent(query)}`;
  return filterQuery ? `${base}&${filterQuery}` : base;
}

/**
 * React island that renders live search results with filter support.
 *
 * Hydrates with SSR-rendered results and updates them on query/filter changes
 * via client-side API calls. Renders matched shops and category suggestions.
 */
export default function FilterableSearchResults({
  initialQuery,
  initialResults,
  initialFilters,
}: FilterableSearchResultsProps) {
  const [{ query, results, currentFilters }, dispatch] = useReducer(searchResultsReducer, {
    query: initialQuery,
    results: initialResults,
    currentFilters: initialFilters,
  });
  const shopGridRef = useGridAnimation();

  const fetchResults = useCallback((q: string, filters: ShopFilters) => {
    dispatch({ type: "filters", filters });

    // Update URL
    const filterQuery = buildFilterQuery(filters);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filterQuery) {
      for (const [k, v] of new URLSearchParams(filterQuery)) {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search");

    if (q.length < 2) {
      dispatch({ type: "results", results: { shops: [], categories: [], total: 0 } });
      return;
    }

    const apiParams = new URLSearchParams(filterQuery);
    apiParams.set("q", q);

    fetchJson<SearchResults>(`/filtered/search?${apiParams}`)
      .then((data) => {
        dispatch({
          type: "results",
          results: {
            shops: data.shops ?? [],
            categories: data.categories ?? [],
            total: data.total ?? 0,
          },
        });
      })
      .catch(() => {});
  }, []);

  const scheduleSearch = useDebouncedCallback(fetchResults);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    dispatch({ type: "query", query: val });
    scheduleSearch(val.trim(), currentFilters);
  };

  const handleFilterChange = useCallback(
    (filters: ShopFilters) => scheduleSearch(query.trim(), filters),
    [query, scheduleSearch],
  );

  const handleSubmit = useCallback(
    (e: { preventDefault(): void }) => {
      e.preventDefault();
      fetchResults(query.trim(), currentFilters);
    },
    [query, currentFilters, fetchResults],
  );

  const hasQuery = query.trim().length >= 2;

  return (
    <>
      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex flex-col items-center mb-6">
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            aria-label="Shops oder Kategorien suchen"
            placeholder="Shops oder Kategorien suchen…"
            className="w-full px-4 pr-10 py-3 text-base rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "query", query: "" });
                scheduleSearch("", currentFilters);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
              aria-label="Suchfeld löschen"
            >
              <XCircleIcon weight="duotone" className="size-5" />
            </button>
          )}
        </div>
      </form>

      {/* Filter bar (always visible) */}
      <div className="mb-8">
        <ShopFilterBar initialFilters={currentFilters} onFilterChange={handleFilterChange} />
      </div>

      {/* Status line */}
      {hasQuery && (
        <p className="text-sm text-stone-400 mb-6">
          {results.total} {results.total === 1 ? "Treffer" : "Treffer gefunden"}
        </p>
      )}

      {/* No results */}
      {hasQuery && results.total === 0 && (
        <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-100">
          <p className="text-stone-600 mb-2 font-medium">
            Keine Ergebnisse für &bdquo;{query.trim()}&ldquo;
          </p>
          <p className="text-sm text-stone-400 mb-6">
            Vielleicht ist dieser Shop noch nicht in der Liste?
          </p>
          <a
            href="/suggestion"
            className="inline-block px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Shop vorschlagen
          </a>
        </div>
      )}

      {/* Category results */}
      {results.categories.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
            Kategorien
          </h2>
          <div className="flex flex-wrap gap-2">
            {results.categories.map((cat) => (
              <a
                key={cat.id}
                href={buildCategoryHref(cat.slug, currentFilters)}
                className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
              >
                {cat.name}
                {cat.shopCount !== undefined && (
                  <span className="ml-1.5 text-stone-400">({cat.shopCount})</span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Shop results */}
      {results.shops.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
            Shops
          </h2>
          <div ref={shopGridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {results.shops.map((shop) => (
              <ShopCardReact
                key={shop.id}
                shopId={shop.id}
                name={shop.name}
                ogImage={shop.ogImage}
                logoBackgroundColor={shop.logoBackgroundColor}
                url={shop.url}
                categories={shop.categories}
                hasCoordinates={
                  shop.headquarters?.latitude != null && shop.headquarters?.longitude != null
                }
                detailHref={buildShopDetailHref(shop.id, query.trim(), currentFilters)}
                likeCount={shop.likeCount}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
