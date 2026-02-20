import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { DonateButton } from "../common/DonateButton.tsx";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    if (q.trim()) navigate(`/suche?q=${encodeURIComponent(q.trim())}`);
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="font-bold text-xl text-[var(--color-primary)] shrink-0">
          dein.shop
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">
            Kategorien
          </Link>
          <Link
            to="/vorschlagen"
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            Shop vorschlagen
          </Link>
          <Link
            to="/ueber-uns"
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            Über uns
          </Link>
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Suche"
            className="p-2 rounded-md text-gray-500 hover:text-[var(--color-primary)] hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <DonateButton />
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Suche"
            className="p-2 rounded-md text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <Link to="/vorschlagen" aria-label="Herz" className="p-2 text-[var(--color-accent)]">
            ♥
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menü"
            className="p-2 rounded-md text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar (expandable) */}
      {searchOpen && (
        <div className="border-t border-gray-100 px-4 py-3 bg-white">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
            <input
              name="q"
              type="search"
              autoFocus
              placeholder="Shop oder Kategorie suchen..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-light)] transition-colors"
            >
              Suchen
            </button>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-4 text-sm font-medium text-gray-700">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Kategorien
          </Link>
          <Link to="/vorschlagen" onClick={() => setMenuOpen(false)}>
            Shop vorschlagen
          </Link>
          <Link to="/ueber-uns" onClick={() => setMenuOpen(false)}>
            Über uns
          </Link>
          <DonateButton />
        </nav>
      )}
    </header>
  );
}
