import { Link, useSearchParams } from "react-router";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";
import { ShopCard } from "../../shops/components/ShopCard.tsx";
import { useShops } from "../../shops/hooks/useShops.ts";
import { useCategories } from "../../categories/hooks/useCategories.ts";
import { useSearch } from "../hooks/useSearch.ts";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.ts";

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  useDocumentTitle(query ? `Suche: ${query}` : "Suche");

  const { data: shops = [] } = useShops();
  const { data: categories = [] } = useCategories();

  const shopResults = useSearch(shops, query);

  const categoryResults = categories.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  const total = shopResults.length + categoryResults.length;

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Suchergebnisse für <span className="text-[var(--color-primary)]">„{query}"</span>
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          {total} {total === 1 ? "Treffer" : "Treffer"}
        </p>

        {total === 0 && query.length >= 2 && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">Keine Ergebnisse für „{query}"</p>
            <p className="text-sm text-gray-400 mb-6">
              Vielleicht ist dieser Shop noch nicht in der Liste?
            </p>
            <Link
              to="/vorschlagen"
              className="inline-block px-5 py-2.5 bg-[var(--color-accent)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Shop vorschlagen
            </Link>
          </div>
        )}

        {categoryResults.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Kategorien
            </h2>
            <div className="flex flex-wrap gap-2">
              {categoryResults.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/kategorie/${cat.slug}`}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  {cat.name}
                  {cat.shopCount !== undefined && (
                    <span className="ml-1.5 text-gray-400">({cat.shopCount})</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {shopResults.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Shops
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {shopResults.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
