import { DonateButton } from "@/components/common/DonateButton.tsx";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";

const navLinkClass = (isActive: boolean) =>
  `font-serif text-base tracking-wide transition-colors ${isActive ? "text-amber-700 font-semibold" : "text-stone-500 hover:text-stone-900"}`;

const mobileNavLinkClass = (isActive: boolean) =>
  `block px-3 py-2 rounded-md font-serif text-base transition-colors ${isActive ? "text-amber-700 bg-amber-50 font-semibold" : "text-stone-600 hover:bg-stone-100"}`;

export function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    if (q.trim()) {
      navigate(`/suche?q=${encodeURIComponent(q.trim())}`);
      setMenuOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="lmaa.space" className="h-8 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
                Kategorien
              </NavLink>
              <NavLink to="/vorschlagen" className={({ isActive }) => navLinkClass(isActive)}>
                Shop vorschlagen
              </NavLink>
              <NavLink to="/ueber-uns" className={({ isActive }) => navLinkClass(isActive)}>
                Über uns
              </NavLink>
            </div>
          </div>

          {/* Right: Search + Donate + Mobile Toggle */}
          <div className="flex items-center gap-2">
            {/* Inline Search (desktop) */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <input
                  name="q"
                  type="search"
                  placeholder="Suchen…"
                  className="w-48 pl-9 pr-3 py-1.5 text-sm rounded-full border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </form>

            <div className="hidden md:block">
              <DonateButton />
            </div>

            {/* Mobile Hamburger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div id="mobile-menu" className="md:hidden">
            <div className="pb-4 pt-2 space-y-1 border-t border-stone-100">
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="px-1 pb-2">
                <div className="relative">
                  <input
                    name="q"
                    type="search"
                    placeholder="Shop oder Kategorie suchen…"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </form>

              <NavLink
                to="/"
                end
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => mobileNavLinkClass(isActive)}
              >
                Kategorien
              </NavLink>
              <NavLink
                to="/vorschlagen"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => mobileNavLinkClass(isActive)}
              >
                Shop vorschlagen
              </NavLink>
              <NavLink
                to="/ueber-uns"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => mobileNavLinkClass(isActive)}
              >
                Über uns
              </NavLink>
              <div className="pt-1 px-1">
                <DonateButton />
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
