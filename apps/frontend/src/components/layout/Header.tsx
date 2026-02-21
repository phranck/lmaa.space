import { useNavigate, Link, NavLink } from "react-router";
import { DonateButton } from "../common/DonateButton.tsx";

export function Header() {
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    if (q.trim()) navigate(`/suche?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-50 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to="/"
            className="font-serif text-xl font-semibold tracking-wide text-stone-900 hover:text-amber-700 transition-colors"
          >
            dein.shop
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm tracking-wide transition-colors ${isActive ? "text-amber-700 font-medium" : "text-stone-500 hover:text-stone-900"}`
              }
            >
              Kategorien
            </NavLink>
            <NavLink
              to="/vorschlagen"
              className={({ isActive }) =>
                `text-sm tracking-wide transition-colors ${isActive ? "text-amber-700 font-medium" : "text-stone-500 hover:text-stone-900"}`
              }
            >
              Shop vorschlagen
            </NavLink>
            <NavLink
              to="/ueber-uns"
              className={({ isActive }) =>
                `text-sm tracking-wide transition-colors ${isActive ? "text-amber-700 font-medium" : "text-stone-500 hover:text-stone-900"}`
              }
            >
              Über uns
            </NavLink>
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
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
              data-hs-collapse='{"el":"#mobile-menu","animate":true}'
              aria-label="Menü öffnen"
              aria-expanded="false"
              aria-controls="mobile-menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          id="mobile-menu"
          className="hidden hs-collapse overflow-hidden transition-all duration-300 md:hidden"
        >
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
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm transition-colors ${isActive ? "text-amber-700 bg-amber-50 font-medium" : "text-stone-600 hover:bg-stone-100"}`
              }
            >
              Kategorien
            </NavLink>
            <NavLink
              to="/vorschlagen"
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm transition-colors ${isActive ? "text-amber-700 bg-amber-50 font-medium" : "text-stone-600 hover:bg-stone-100"}`
              }
            >
              Shop vorschlagen
            </NavLink>
            <NavLink
              to="/ueber-uns"
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm transition-colors ${isActive ? "text-amber-700 bg-amber-50 font-medium" : "text-stone-600 hover:bg-stone-100"}`
              }
            >
              Über uns
            </NavLink>
            <div className="pt-1 px-1">
              <DonateButton />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
