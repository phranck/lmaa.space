import { shopDomain, shopRefUrl } from "@/lib/shop";
import type { Category, Shop } from "@lmaa/shared";
import Fuse, { type IFuseOptions } from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Props for the client-side search island.
 */
interface Props {
  shops: Shop[];
  categories: Category[];
}

const FUSE_OPTIONS: IFuseOptions<Shop> = {
  keys: [
    { name: "name", weight: 0.4 },
    { name: "description", weight: 0.3 },
    { name: "categories.name", weight: 0.2 },
    { name: "region", weight: 0.05 },
    { name: "shipping", weight: 0.05 },
  ],
  threshold: 0.35,
  minMatchCharLength: 2,
  includeScore: true,
};

/**
 * Interactive catalog search used on the public search page.
 *
 * Hidden behavior: reads/writes the `q` query parameter client-side so links
 * stay shareable and browser history is preserved.
 *
 * @param props - Preloaded shops/categories from Astro server rendering.
 * @returns Hydrated search UI with category and shop result sections.
 */
export default function SearchIsland({ shops, categories }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Read ?q= URL param after hydration
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    if (q) {
      setQuery(q);
      setDebouncedQuery(q);
      inputRef.current?.focus();
    }
  }, []);

  // Debounce: update debouncedQuery 200ms after last keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const fuse = useMemo(() => new Fuse(shops, FUSE_OPTIONS), [shops]);

  const shopResults = useMemo(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) return [];
    return fuse.search(debouncedQuery).map((r) => r.item);
  }, [fuse, debouncedQuery]);

  const categoryResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return categories.filter((c) => c.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
  }, [categories, debouncedQuery]);

  const total = shopResults.length + categoryResults.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Search input – centered */}
      <div className="flex flex-col items-center mb-10">
        <input
          ref={inputRef}
          type="search"
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

      {debouncedQuery.length >= 2 && (
        <output aria-live="polite" className="text-sm text-stone-400 mb-6 search-section-enter">
          {total} {total === 1 ? "Treffer" : "Treffer gefunden"}
        </output>
      )}

      {total === 0 && debouncedQuery.length >= 2 && (
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
