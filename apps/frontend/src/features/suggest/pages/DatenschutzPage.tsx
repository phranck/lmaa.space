import { PageLayout } from "../../../components/layout/PageLayout.tsx";

export function DatenschutzPage() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>
        <div className="text-gray-600 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">1. Allgemeines</h2>
            <p>
              Der Schutz deiner persönlichen Daten ist uns wichtig. Diese Seite verwendet
              kein Google Analytics, keine Tracking-Cookies und keine Werbenetzwerke.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">2. Server-Logs</h2>
            <p>
              Beim Aufruf dieser Website werden automatisch Informationen in Server-Logfiles
              gespeichert (IP-Adresse, Zeitpunkt, aufgerufene URL). Diese Daten werden nicht
              mit anderen Datenquellen zusammengeführt und nach 7 Tagen gelöscht.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">3. Vorschlagsformular</h2>
            <p>
              Wenn du über das Vorschlagsformular einen Shop vorschlägst, werden die
              eingegebenen Daten (Shop-Name, URL, Kategorie, optionale E-Mail) gespeichert,
              um den Vorschlag prüfen zu können. Eine freiwillig angegebene E-Mail-Adresse
              wird ausschließlich für Rückmeldungen zum Vorschlag genutzt und danach gelöscht.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">4. Externe Links</h2>
            <p>
              Diese Seite enthält Links zu externen Websites. Für deren Inhalte sind die
              jeweiligen Betreiber verantwortlich.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
