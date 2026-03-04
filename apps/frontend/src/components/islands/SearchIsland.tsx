import { API_BASE } from "@/lib/client-api";
import { shopDomain, shopRefUrl } from "@/lib/shop";
import { useEffect, useReducer, useRef, useState } from "react";

interface CategoryRef {
  id: number;
  slug: string;
  name: string;
}

interface ShopResult {
  id: number;
  name: string;
  url: string;
  ogImage: string | null;
  description: string;
  categories: CategoryRef[];
}

interface CategoryResult {
  id: number;
  slug: string;
  name: string;
  shopCount?: number;
}

interface SearchResults {
  shops: ShopResult[];
  categories: CategoryResult[];
  total: number;
}

type SearchState = { results: SearchResults | null; loading: boolean };
type SearchAction =
  | { type: "reset" }
  | { type: "start" }
  | { type: "done"; results: SearchResults }
  | { type: "error" };

function searchReducer(_state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "reset":
      return { results: null, loading: false };
    case "start":
      return { results: null, loading: true };
    case "done":
      return { results: action.results, loading: false };
    case "error":
      return { results: null, loading: false };
  }
}

function useSearch(debouncedQuery: string) {
  const [state, dispatch] = useReducer(searchReducer, { results: null, loading: false });

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      dispatch({ type: "reset" });
      return;
    }

    let cancelled = false;
    dispatch({ type: "start" });

    fetch(`${API_BASE}/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) dispatch({ type: "done", results: json.data as SearchResults });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return state;
}

/**
 * Interactive catalog search backed by PostgreSQL full-text search.
 *
 * Fetches results from GET /api/search?q=... on each debounced keystroke.
 * Reads/writes the `q` query parameter so search links stay shareable.
 */
export default function SearchIsland() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useSearch(debouncedQuery);

  // Read ?q= URL param after hydration
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    if (q) {
      setQuery(q);
      setDebouncedQuery(q);
      inputRef.current?.focus();
    }
  }, []);

  // Debounce: update debouncedQuery 350ms after last keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const shopResults = results?.shops ?? [];
  const categoryResults = results?.categories ?? [];
  const total = results?.total ?? 0;
  const hasQuery = debouncedQuery.length >= 2;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Search input */}
      <div className="flex flex-col items-center mb-10">
        <input
          ref={inputRef}
          type="search"
          aria-label="Shop oder Kategorie suchen"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            const url = new URL(window.location.href);
            if (v) url.searchParams.set("q", v);
            else url.searchParams.delete("q");
            window.history.replaceState(null, "", url);
          }}
          placeholder="Shop oder Kategorie suchen…"
          className="w-full max-w-xl px-4 py-3 text-base rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
        />
      </div>

      {/* Status line */}
      {hasQuery && !loading && (
        <output
          aria-live="polite"
          className="block text-sm text-stone-400 mb-6 search-section-enter"
        >
          {total} {total === 1 ? "Treffer" : "Treffer gefunden"}
        </output>
      )}

      {/* Loading */}
      {loading && <p className="text-sm text-stone-400 mb-6">Suche…</p>}

      {/* No results */}
      {!loading && hasQuery && total === 0 && (
        <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-100 search-section-enter">
          <p className="text-stone-600 mb-2 font-medium">Keine Ergebnisse für „{debouncedQuery}"</p>
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
      {categoryResults.length > 0 && (
        <section className="mb-10 search-section-enter">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
            Kategorien
          </h2>
          <div className="flex flex-wrap gap-2">
            {categoryResults.map((cat) => (
              <a
                key={cat.id}
                href={`/category/${cat.slug}`}
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
      {shopResults.length > 0 && (
        <section className="search-section-enter">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
            Shops
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {shopResults.map((shop) => {
              const domain = shopDomain(shop.url);
              const shopUrl = shopRefUrl(shop.url);
              return (
                <div
                  key={shop.id}
                  className="bg-white rounded-3xl border border-stone-200 p-4 flex flex-col gap-3 hover:shadow-md hover:border-stone-300 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 flex items-center justify-center">
                      {shop.ogImage ? (
                        <img
                          src={shop.ogImage}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-stone-300 select-none">
                          {shop.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-semibold text-stone-900 text-base leading-snug">
                        {shop.name}
                      </h3>
                      <p className="text-sm text-stone-400 mt-0.5 truncate">{domain}</p>
                      {shop.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {shop.categories.map((cat) => (
                            <a
                              key={cat.id}
                              href={`/category/${cat.slug}`}
                              className="px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                            >
                              {cat.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <a
                      href={shopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--accent-hover)] text-[var(--accent-text)] hover:bg-[var(--accent-active)] transition-colors"
                    >
                      Besuchen ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
