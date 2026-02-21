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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1.5">
            Suche: <span className="text-amber-700">„{query}"</span>
          </h1>
          <p className="text-sm text-stone-400">
            {total} {total === 1 ? "Treffer" : "Treffer"}
          </p>
        </div>

        {total === 0 && query.length >= 2 && (
          <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-100">
            <p className="text-stone-600 mb-2 font-medium">Keine Ergebnisse für „{query}"</p>
            <p className="text-sm text-stone-400 mb-6">
              Vielleicht ist dieser Shop noch nicht in der Liste?
            </p>
            <Link
              to="/vorschlagen"
              className="inline-block px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Shop vorschlagen
            </Link>
          </div>
        )}

        {categoryResults.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
              Kategorien
            </h2>
            <div className="flex flex-wrap gap-2">
              {categoryResults.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/kategorie/${cat.slug}`}
                  className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
                >
                  {cat.name}
                  {cat.shopCount !== undefined && (
                    <span className="ml-1.5 text-stone-400">({cat.shopCount})</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {shopResults.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
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
