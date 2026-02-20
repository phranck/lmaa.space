import { Link, useParams } from "react-router";
import type { Shop } from "@dein-shop/shared";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";
import { ShopCard } from "../../shops/components/ShopCard.tsx";
import { useCategory } from "../hooks/useCategories.ts";

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useCategory(slug ?? "");

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1">
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">
            Home
          </Link>
          <span>›</span>
          <span className="text-gray-700">{data?.name ?? "Kategorie"}</span>
        </nav>

        {isLoading && (
          <div>
            <div className="h-8 bg-gray-100 rounded w-48 animate-pulse mb-2" />
            <div className="h-4 bg-gray-100 rounded w-32 animate-pulse mb-8" />
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <p className="text-gray-500">Kategorie nicht gefunden.</p>
            <Link to="/" className="mt-4 inline-block text-[var(--color-primary)] text-sm">
              ← Zurück zur Startseite
            </Link>
          </div>
        )}

        {data && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{data.name}</h1>
              <p className="text-gray-400 text-sm">
                {(data.shops as Shop[]).length}{" "}
                {(data.shops as Shop[]).length === 1 ? "Shop" : "Shops"} in dieser Kategorie
              </p>
            </div>

            {(data.shops as Shop[]).length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">Noch keine Shops in dieser Kategorie.</p>
                <Link
                  to="/vorschlagen"
                  className="inline-block px-5 py-2.5 bg-[var(--color-accent)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Ersten Shop vorschlagen
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {(data.shops as Shop[]).map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
