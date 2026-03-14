import { useCallback, useRef, useState } from "react";

import { encodeShopToken, type Shop } from "@lmaa/shared";

import ShopCardReact from "@/components/ShopCardReact";
import { API_BASE } from "@/lib/client-api";
import { type ShopFilters, buildFilterQuery } from "@/lib/filter-query";

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

function buildShopDetailHref(
  shopId: number,
  query: string,
  filters: ShopFilters,
): string {
  const filterQuery = buildFilterQuery(filters);
  const base = `/shop/${encodeShopToken(shopId)}?from=search&q=${encodeURIComponent(query)}`;
  return filterQuery ? `${base}&${filterQuery}` : base;
}

function buildCategoryHref(slug: string, filters: ShopFilters): string {
  const query = buildFilterQuery(filters);
  return query ? `/category/${slug}?${query}` : `/category/${slug}`;
}

export default function FilterableSearchResults({
  initialQuery,
  initialResults,
  initialFilters,
}: FilterableSearchResultsProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults>(initialResults);
  const [currentFilters, setCurrentFilters] =
    useState<ShopFilters>(initialFilters);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchResults = useCallback(
    (q: string, filters: ShopFilters) => {
      setCurrentFilters(filters);

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
        setResults({ shops: [], categories: [], total: 0 });
        return;
      }

      const apiParams = new URLSearchParams(filterQuery);
      apiParams.set("q", q);

      fetch(`${API_BASE}/filtered/search?${apiParams}`)
        .then((r) => r.json())
        .then((json) => {
          setResults({
            shops: json.shops ?? [],
            categories: json.categories ?? [],
            total: json.total ?? 0,
          });
        })
        .catch(() => {});
    },
    [],
  );

  const scheduleSearch = useCallback(
    (q: string, filters: ShopFilters) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchResults(q, filters), 400);
    },
    [fetchResults],
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    scheduleSearch(val.trim(), currentFilters);
  };

  const handleFilterChange = useCallback(
    (filters: ShopFilters) => {
      setCurrentFilters(filters);
      scheduleSearch(query.trim(), filters);
    },
    [query, scheduleSearch],
  );

  const handleSubmit = useCallback(
    (e: { preventDefault(): void }) => {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      fetchResults(query.trim(), currentFilters);
    },
    [query, currentFilters, fetchResults],
  );

  const hasQuery = query.trim().length >= 2;

  return (
    <>
      {/* Search form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center mb-6"
      >
        <input
          type="search"
          value={query}
          onChange={handleQueryChange}
          aria-label="Shop oder Kategorie suchen"
          placeholder="Shop oder Kategorie suchen…"
          className="w-full max-w-xl px-4 py-3 text-base rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
        />
      </form>

      {/* Filter bar (always visible) */}
      <div className="mb-8">
        <ShopFilterBar
          initialFilters={currentFilters}
          onFilterChange={handleFilterChange}
        />
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
                  <span className="ml-1.5 text-stone-400">
                    ({cat.shopCount})
                  </span>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {results.shops.map((shop) => (
              <ShopCardReact
                key={shop.id}
                name={shop.name}
                ogImage={shop.ogImage}
                url={shop.url}
                categories={shop.categories}
                detailHref={buildShopDetailHref(
                  shop.id,
                  query.trim(),
                  currentFilters,
                )}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
