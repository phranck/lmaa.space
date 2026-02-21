import { PageLayout } from "../../../components/layout/PageLayout.tsx";

export function ImpressumPage() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-10">
          Impressum
        </h1>

        <div className="space-y-10 text-stone-600 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Angaben gem. § 5 ECG
            </h2>
            <p className="text-sm leading-relaxed">
              Frank Gregor
              <br />
              Landstrasse 21c
              <br />
              6900 Bregenz
              <br />
              Österreich
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Kontakt
            </h2>
            <p className="text-sm leading-relaxed">
              E-Mail:{" "}
              <a
                href="mailto:hallo@dein.shop"
                className="text-amber-700 hover:underline"
              >
                hallo@dein.shop
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Medieninhaber gem. § 25 MedienG
            </h2>
            <p className="text-sm leading-relaxed">
              Frank Gregor, Landstrasse 21c, 6900 Bregenz, Österreich
            </p>
            <p className="text-sm leading-relaxed mt-2">
              <strong className="text-stone-700">Grundlegende Richtung:</strong>{" "}
              dein.shop ist ein privates, nicht-kommerzielles Community-Projekt.
              Zweck ist die Sammlung und Präsentation von unabhängigen
              Online-Shops als Alternativen zu Amazon für den deutschsprachigen
              Raum. Es besteht kein Erwerbszweck, keine Affiliate-Vergütung und
              kein Tracking.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Bildnachweise
            </h2>
            <p className="text-sm leading-relaxed">
              Alle in den Kategorien verwendeten Fotos sind frei verfügbare
              Bilder von{" "}
              <a
                href="https://unsplash.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:underline"
              >
                Unsplash
              </a>{" "}
              und stehen unter der{" "}
              <a
                href="https://unsplash.com/license"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:underline"
              >
                Unsplash License
              </a>
              . Eine kommerzielle Nutzung oder Weiterverbreitung der Fotos ist
              ohne ausdrückliche Genehmigung der jeweiligen Fotografen nicht
              gestattet.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              Haftungsausschluss
            </h2>
            <p className="text-sm leading-relaxed">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine
              Haftung für die Inhalte externer Links. Für den Inhalt der
              verlinkten Seiten sind ausschließlich deren Betreiber
              verantwortlich. Die aufgelisteten Shops wurden manuell geprüft;
              eine laufende Überwachung ist ohne konkrete Hinweise jedoch nicht
              zumutbar.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
