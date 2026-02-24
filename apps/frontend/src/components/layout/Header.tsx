import { DonateButton } from "@/components/common/DonateButton.tsx";
import { useNav } from "@/hooks/useNav.ts";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { SFLine3Horizontal, SFMagnifyingglass, SFXmark } from "sf-symbols-lib/monochrome";

const navLinkClass = (isActive: boolean) =>
  `font-serif text-lg tracking-wide transition-colors ${isActive ? "text-amber-700 font-semibold" : "text-stone-500 hover:text-stone-900"}`;

const mobileNavLinkClass = (isActive: boolean) =>
  `block px-3 py-2 rounded-md font-serif text-lg transition-colors ${isActive ? "text-amber-700 bg-amber-50 font-semibold" : "text-stone-600 hover:bg-stone-100"}`;

export function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: navItems } = useNav("header");

  const dynamicLinks = (navItems ?? []).map((item) => ({
    label: item.label ?? item.pageTitle ?? item.url ?? "",
    to: item.url ?? `/${item.pageSlug}`,
    target: item.target ?? "_self",
    external: item.target === "_blank" || (item.url?.startsWith("http") ?? false),
  }));

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
              {dynamicLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.to}
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={navLinkClass(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => navLinkClass(isActive)}
                  >
                    {link.label}
                  </NavLink>
                ),
              )}
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
                <SFMagnifyingglass
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                  aria-hidden="true"
                />
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
              {menuOpen
                ? <SFXmark size={20} aria-hidden="true" />
                : <SFLine3Horizontal size={20} aria-hidden="true" />
              }
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
                  <SFMagnifyingglass
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </form>

              {dynamicLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.to}
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className={mobileNavLinkClass(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => mobileNavLinkClass(isActive)}
                  >
                    {link.label}
                  </NavLink>
                ),
              )}
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
