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
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 4.643-5.813 4.643h-1.747a.74.74 0 0 0-.731.627l-.988 6.263-.28 1.79a.39.39 0 0 0 .386.45h2.71c.459 0 .851-.333.923-.787l.038-.2.733-4.647.047-.257a.93.93 0 0 1 .923-.788h.581c3.765 0 6.712-1.53 7.573-5.953.36-1.845.174-3.384-.71-4.467a2.84 2.84 0 0 0-.981-.637z" />
                </svg>
                Via PayPal spenden
              </a>
              <a
                href="https://ko-fi.com/layeredwork?ref=dein.shop"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF5E5B] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 2.68.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.015-2.059 2.015z" />
                </svg>
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
