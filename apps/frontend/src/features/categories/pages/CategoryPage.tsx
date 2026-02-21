import { Link, useParams } from "react-router";
import type { Shop } from "@dein-shop/shared";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";
import { ShopCard } from "../../shops/components/ShopCard.tsx";
import { useCategory } from "../hooks/useCategories.ts";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.ts";
import { categoryHeroImage } from "../../../lib/categoryImages.ts";

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useCategory(slug ?? "");
  useDocumentTitle(data?.name);

  return (
    <PageLayout>
      {/* Hero Banner */}
      {(data || isLoading) && (
        <div className="relative h-52 sm:h-64 overflow-hidden">
          <img
            src={categoryHeroImage(slug ?? "allgemein")}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-stone-900/65" />
          <div className="absolute inset-0 flex flex-col justify-end px-6 sm:px-10 pb-8">
            {isLoading ? (
              <div className="h-8 w-48 bg-white/20 rounded animate-pulse" />
            ) : data ? (
              <>
<h1 className="font-serif text-2xl sm:text-3xl font-semibold text-white">
                  {data.name}
                </h1>
                <p className="text-stone-300 text-sm mt-1">
                  {(data.shops as Shop[]).length}{" "}
                  {(data.shops as Shop[]).length === 1 ? "Shop" : "Shops"} in dieser Kategorie
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-stone-400 mb-8">
          <Link to="/" className="hover:text-amber-700 transition-colors">
            Start
          </Link>
          <span className="text-stone-300">›</span>
          <span className="text-stone-600">{data?.name ?? "Kategorie"}</span>
        </nav>

        {isLoading && (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="text-stone-500 mb-4">Kategorie nicht gefunden.</p>
            <Link to="/" className="text-sm text-amber-700 hover:underline">
              ← Zurück zur Startseite
            </Link>
          </div>
        )}

        {data && (
          <>
            {(data.shops as Shop[]).length === 0 ? (
              <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-100">
                <p className="text-stone-500 mb-5">Noch keine Shops in dieser Kategorie.</p>
                <Link
                  to="/vorschlagen"
                  className="inline-block px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
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
