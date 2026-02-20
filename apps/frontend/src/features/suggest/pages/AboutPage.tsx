import { Link } from "react-router";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";

export function AboutPage() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Über dein.shop</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Was ist dein.shop?</h2>
            <p>
              dein.shop ist eine Community-kuratierte Sammlung von Online-Shops als Alternativen
              zu Amazon – für den deutschsprachigen Raum. Alle Shops werden manuell geprüft,
              bevor sie aufgenommen werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Wie kann ich mitmachen?</h2>
            <p>
              Ganz einfach:{" "}
              <Link to="/vorschlagen" className="text-[var(--color-primary)] hover:underline">
                Schlage einen Shop vor
              </Link>
              . Kein Account, keine Registrierung. Wir prüfen deinen Vorschlag und nehmen
              ihn bei Eignung auf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Wer steckt dahinter?</h2>
            <p>
              dein.shop ist ein privates Community-Projekt ohne kommerzielle Interessen.
              Alle Kosten (Hosting, Domain) werden selbst getragen. Es gibt keine
              Affiliate-Links und kein Tracking.
            </p>
            <p className="mt-2">
              Das Ursprungsprojekt begann als{" "}
              <a
                href="https://codeberg.org/phranck/Amazon-Alternativen"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline"
              >
                Markdown-Liste auf Codeberg
              </a>
              . Diese Web-App macht das Projekt für alle zugänglicher.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Datenschutz</h2>
            <p>
              Kein Google Analytics. Kein Facebook-Pixel. Keine Tracking-Cookies.
              Sieh dir unsere{" "}
              <Link to="/datenschutz" className="text-[var(--color-primary)] hover:underline">
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
