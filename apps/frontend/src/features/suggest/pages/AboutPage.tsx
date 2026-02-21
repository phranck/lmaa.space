import { Link } from "react-router";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";

export function AboutPage() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-10">
          Über dein.shop
        </h1>

        <div className="space-y-10 text-stone-600 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Was ist dein.shop?
            </h2>
            <p className="text-sm leading-relaxed">
              dein.shop ist eine Community-kuratierte Sammlung von Online-Shops als Alternativen
              zu Amazon – für den deutschsprachigen Raum. Alle Shops werden manuell geprüft,
              bevor sie aufgenommen werden.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Wie kann ich mitmachen?
            </h2>
            <p className="text-sm leading-relaxed">
              Ganz einfach:{" "}
              <Link to="/vorschlagen" className="text-amber-700 hover:underline">
                Schlage einen Shop vor
              </Link>
              . Kein Account, keine Registrierung. Wir prüfen deinen Vorschlag und nehmen
              ihn bei Eignung auf.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Wer steckt dahinter?
            </h2>
            <p className="text-sm leading-relaxed">
              dein.shop ist ein privates Community-Projekt ohne kommerzielle Interessen.
              Alle Kosten (Hosting, Domain) werden selbst getragen. Es gibt keine
              Affiliate-Links und kein Tracking.
            </p>
            <p className="text-sm leading-relaxed mt-3">
              Das Ursprungsprojekt begann als{" "}
              <a
                href="https://codeberg.org/phranck/Amazon-Alternativen"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:underline"
              >
                Markdown-Liste auf Codeberg
              </a>
              . Diese Web-App macht das Projekt für alle zugänglicher.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Datenschutz
            </h2>
            <p className="text-sm leading-relaxed">
              Kein Google Analytics. Kein Facebook-Pixel. Keine Tracking-Cookies.
              Sieh dir unsere{" "}
              <Link to="/datenschutz" className="text-amber-700 hover:underline">
                Datenschutzerklärung
              </Link>{" "}
              an.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
