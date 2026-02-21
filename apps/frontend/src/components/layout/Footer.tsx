import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="mt-auto bg-stone-900 text-stone-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">

          {/* About */}
          <div>
            <p className="font-serif text-lg font-semibold text-white mb-3 tracking-wide">
              dein.shop
            </p>
            <p className="text-sm text-stone-400 leading-relaxed">
              Eine Community-kuratierte Liste von Online-Shops als Alternativen
              zu Amazon – für den deutschsprachigen Raum.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">
              Navigation
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/ueber-uns" className="text-stone-400 hover:text-amber-400 transition-colors">
                  Über uns
                </Link>
              </li>
              <li>
                <Link to="/vorschlagen" className="text-stone-400 hover:text-amber-400 transition-colors">
                  Shop vorschlagen
                </Link>
              </li>
              <li>
                <Link to="/impressum" className="text-stone-400 hover:text-amber-400 transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link to="/datenschutz" className="text-stone-400 hover:text-amber-400 transition-colors">
                  Datenschutz
                </Link>
              </li>
            </ul>
          </div>

          {/* Donate */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">
              Projekt unterstützen
            </p>
            <p className="text-sm text-stone-400 mb-5 leading-relaxed">
              dein.shop ist ein privates Community-Projekt. Über eine kleine
              Unterstützung freuen wir uns sehr.
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href="https://paypal.me/phranck"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0070BA] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Via PayPal spenden
              </a>
              <a
                href="https://ko-fi.com/phranck"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF5E5B] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Via Ko-Fi spenden
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
          <span>© {new Date().getFullYear()} dein.shop – Community-Projekt ohne kommerzielle Interessen</span>
          <a
            href="https://codeberg.org/phranck/Amazon-Alternativen"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 transition-colors"
          >
            Ursprungsprojekt auf Codeberg ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
