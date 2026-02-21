import { useNavigate } from "react-router";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";
import { CategoryGrid } from "../components/CategoryGrid.tsx";
import { useCategories } from "../hooks/useCategories.ts";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.ts";
import { heroImage } from "../../../lib/categoryImages.ts";

export function HomePage() {
  useDocumentTitle();
  const { data: categories, isLoading } = useCategories();
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    if (q.trim()) navigate(`/suche?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-stone-950/70" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4">
            Community-kuratiert · Unabhängig · Kostenlos
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-6 leading-tight">
            Faire Alternativen<br />
            <span className="text-amber-400">zu Amazon</span>
          </h1>
          <p className="text-stone-300 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Entdecke unabhängige Online-Shops – kuratiert von der Community für
            den deutschsprachigen Raum.
          </p>

          <form onSubmit={handleSearch} className="max-w-lg mx-auto">
            <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/10">
              <input
                name="q"
                type="search"
                placeholder="Shop oder Kategorie suchen…"
                className="flex-1 px-4 py-2.5 bg-transparent text-white placeholder-stone-400 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 text-white rounded-xl font-medium text-sm hover:bg-amber-400 transition-colors shrink-0"
              >
                Suchen
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-serif text-2xl font-semibold text-stone-800">
            Kategorien entdecken
          </h2>
          {categories && (
            <span className="text-sm text-stone-400">
              {categories.reduce((sum, c) => sum + (c.shopCount ?? 0), 0)} Shops in{" "}
              {categories.length} Kategorien
            </span>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-28 bg-stone-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {categories && <CategoryGrid categories={categories} />}
      </section>

      {/* CTA */}
      <section className="bg-amber-50 border-y border-amber-100">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="font-serif text-2xl font-semibold text-stone-800 mb-3">
            Vermisst du einen Shop?
          </h2>
          <p className="text-stone-500 mb-6 text-sm leading-relaxed">
            Hilf der Community und schlage deinen Shop vor – schnell
            und ohne Anmeldung.
          </p>
          <a
            href="/vorschlagen"
            className="inline-block px-7 py-3 bg-stone-900 text-white rounded-xl font-medium text-sm hover:bg-stone-800 transition-colors"
          >
            Shop vorschlagen
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
