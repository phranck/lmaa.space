import { useNavigate } from "react-router";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";
import { CategoryGrid } from "../components/CategoryGrid.tsx";
import { useCategories } from "../hooks/useCategories.ts";

export function HomePage() {
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
      <section className="bg-gradient-to-b from-[var(--color-background)] to-white px-4 py-14 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[var(--color-primary)] mb-3">
          dein.shop
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
          Amazon-Alternativen, kuratiert von der Community – für den deutschsprachigen Raum.
        </p>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
          <input
            name="q"
            type="search"
            placeholder="Shop oder Kategorie suchen..."
            className="flex-1 px-5 py-3 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-base"
          />
          <button
            type="submit"
            className="px-5 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-light)] transition-colors shadow-sm"
          >
            Suchen
          </button>
        </form>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Kategorien entdecken</h2>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {categories && <CategoryGrid categories={categories} />}
      </section>

      {/* CTA */}
      <section className="bg-[var(--color-background)] border-t border-gray-100 px-4 py-12 text-center">
        <p className="text-gray-600 mb-4 text-base">
          Fehlt ein Shop? Hilf der Community!
        </p>
        <a
          href="/vorschlagen"
          className="inline-block px-6 py-3 bg-[var(--color-accent)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          Shop vorschlagen
        </a>
      </section>
    </PageLayout>
  );
}
