import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <p className="font-bold text-[var(--color-primary)] text-lg mb-2">dein.shop</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Eine Community-kuratierte Liste von Online-Shops als Alternativen zu Amazon –
              für den deutschsprachigen Raum.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-semibold text-gray-800 mb-3 text-sm">Links</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <Link to="/ueber-uns" className="hover:text-[var(--color-primary)] transition-colors">
                  Über uns
                </Link>
              </li>
              <li>
                <Link to="/vorschlagen" className="hover:text-[var(--color-primary)] transition-colors">
                  Shop vorschlagen
                </Link>
              </li>
              <li>
                <Link to="/impressum" className="hover:text-[var(--color-primary)] transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link to="/datenschutz" className="hover:text-[var(--color-primary)] transition-colors">
                  Datenschutz
                </Link>
              </li>
            </ul>
          </div>

          {/* Donate */}
          <div>
            <p className="font-semibold text-gray-800 mb-3 text-sm">Projekt unterstützen</p>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              dein.shop ist ein privates Community-Projekt. Alle Kosten werden selbst
              getragen. Über eine kleine Spende freuen wir uns sehr!
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="https://paypal.me/phranck"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0070BA] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <span>PayPal</span>
              </a>
              <a
                href="https://ko-fi.com/phranck"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5E5B] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <span>Ko-Fi</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 text-xs text-gray-400 text-center">
          dein.shop – Community-Projekt ohne kommerzielle Interessen ·{" "}
          <a
            href="https://codeberg.org/phranck/Amazon-Alternativen"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            Ursprungsprojekt auf Codeberg
          </a>
        </div>
      </div>
    </footer>
  );
}
