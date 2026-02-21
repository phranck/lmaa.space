import { Link } from "react-router";
import { PageLayout } from "../../../components/layout/PageLayout.tsx";

export function DatenschutzPage() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">
          Datenschutzerklärung
        </h1>
        <p className="text-sm text-stone-400 mb-10">
          Gem. Art. 13 und 14 DSGVO sowie § 1 DSG (Österreich)
        </p>

        <div className="space-y-10 text-stone-600 leading-relaxed">

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              1. Verantwortlicher
            </h2>
            <p className="text-sm leading-relaxed">
              Verantwortlicher im Sinne der DSGVO ist:
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Frank Gregor
              <br />
              Landstrasse 21c
              <br />
              6900 Bregenz, Österreich
              <br />
              E-Mail:{" "}
              <a href="mailto:hallo@dein.shop" className="text-amber-700 hover:underline">
                hallo@dein.shop
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              2. Grundsätze
            </h2>
            <p className="text-sm leading-relaxed">
              Der Schutz deiner personenbezogenen Daten hat für uns höchste
              Priorität. dein.shop wurde von Grund auf datenschutzfreundlich
              konzipiert: Es werden keine Tracking-Cookies gesetzt, keine
              Analyse-Dienste von Drittanbietern eingebunden und keine
              personenbezogenen Daten an Dritte weitergegeben oder verkauft.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Es gibt keine Nutzerkonten, keine Registrierung und keine
              Profilbildung. Werbung wird nicht ausgespielt.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              3. Hosting
            </h2>
            <p className="text-sm leading-relaxed">
              Diese Website wird ausschließlich auf Infrastruktur von{" "}
              <a
                href="https://zerops.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:underline"
              >
                Zerops
              </a>{" "}
              betrieben. Die Server befinden sich in Tschechien, einem
              Mitgliedsstaat der Europäischen Union. Eine Übermittlung von
              Daten in Drittstaaten außerhalb der EU findet nicht statt.
              Zerops stellt die technische Infrastruktur bereit und ist als
              Anbieter mit Sitz in der EU an die Anforderungen der DSGVO
              gebunden.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              4. Serverprotokolle
            </h2>
            <p className="text-sm leading-relaxed">
              Beim Aufruf dieser Website speichert der Webserver automatisch
              technische Zugriffsdaten in sogenannten Serverprotokollen. Dazu
              gehören:
            </p>
            <ul className="text-sm leading-relaxed mt-2 ml-4 list-disc space-y-1">
              <li>IP-Adresse des anfragenden Geräts</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>Aufgerufene URL</li>
              <li>HTTP-Statuscode</li>
              <li>Übertragene Datenmenge</li>
            </ul>
            <p className="text-sm leading-relaxed mt-2">
              Diese Daten werden ausschließlich zur Sicherstellung des
              technischen Betriebs sowie zur Erkennung und Abwehr von
              Angriffen benötigt. Sie werden nicht mit anderen Datenquellen
              zusammengeführt. Die Speicherdauer richtet sich nach den
              Standardeinstellungen der Hosting-Infrastruktur von Zerops.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse am sicheren Betrieb der Website).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              5. Vorschlagsformular
            </h2>
            <p className="text-sm leading-relaxed">
              Wenn du über das Formular unter{" "}
              <Link to="/vorschlagen" className="text-amber-700 hover:underline">
                /vorschlagen
              </Link>{" "}
              einen Shop einreichst, werden folgende Angaben gespeichert:
            </p>
            <ul className="text-sm leading-relaxed mt-2 ml-4 list-disc space-y-1">
              <li>Name und URL des vorgeschlagenen Shops</li>
              <li>Gewählte oder vorgeschlagene Kategorie</li>
              <li>Optionale Beschreibung</li>
              <li>
                Optionale E-Mail-Adresse (ausschließlich für Rückmeldungen
                zum Vorschlag)
              </li>
            </ul>
            <p className="text-sm leading-relaxed mt-2">
              Diese Daten werden nur zur Prüfung und gegebenenfalls Aufnahme
              des Shops verwendet. Eine freiwillig angegebene E-Mail-Adresse
              wird nach Abschluss des Prüfprozesses gelöscht und nicht für
              Werbung oder andere Zwecke genutzt. Rechtsgrundlage ist Art. 6
              Abs. 1 lit. a DSGVO (Einwilligung durch Absenden des Formulars).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              6. Keine Cookies, datenschutzfreundliche Statistiken
            </h2>
            <p className="text-sm leading-relaxed">
              Diese Website setzt keinerlei Cookies und verwendet keine
              Tracking-Dienste wie Google Analytics, Meta Pixel oder
              vergleichbare Anbieter. Es werden keine Nutzerprofile erstellt
              und kein geräteübergreifendes Tracking durchgeführt.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Zur Erfassung anonymer Nutzungsstatistiken wird eine
              selbstgehostete Instanz von{" "}
              <a
                href="https://umami.is"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:underline"
              >
                Umami
              </a>{" "}
              eingesetzt. Umami ist eine quelloffene, datenschutzfreundliche
              Analysesoftware, die ohne Cookies auskommt und keine
              personenbezogenen Daten speichert. IP-Adressen werden nicht
              gespeichert. Die erfassten Daten beschränken sich auf aggregierte
              Kennzahlen wie Seitenaufrufe und ungefähre Herkunftsregionen.
              Rückschlüsse auf einzelne Personen sind nicht möglich.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Die Statistikinstanz wird ausschließlich auf unserer eigenen
              Infrastruktur bei Zerops in Tschechien betrieben. Es findet
              keine Übermittlung von Daten an Dritte statt. Da keinerlei
              personenbezogene Daten verarbeitet werden, ist eine Einwilligung
              nicht erforderlich. Soweit die Verarbeitung aggregierter
              technischer Nutzungsdaten dennoch als Datenverarbeitung im Sinne
              der DSGVO eingestuft wird, stützt sich diese auf Art. 6 Abs. 1
              lit. f DSGVO (berechtigtes Interesse an der Verbesserung und
              dem sicheren Betrieb der Website).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              7. Externe Links
            </h2>
            <p className="text-sm leading-relaxed">
              Diese Website enthält Links zu externen Shops und Websites. Beim
              Klick auf einen solchen Link verlässt du dein.shop. Für die
              Datenschutzpraktiken der verlinkten Websites sind ausschließlich
              deren Betreiber verantwortlich. Wir empfehlen, die
              Datenschutzerklärungen der jeweiligen Anbieter zu lesen.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              8. Deine Rechte
            </h2>
            <p className="text-sm leading-relaxed">
              Gemäß DSGVO stehen dir folgende Rechte zu:
            </p>
            <ul className="text-sm leading-relaxed mt-2 ml-4 list-disc space-y-1">
              <li>
                <strong className="text-stone-700">Auskunft</strong>{" "}
                (
                <a
                  href="https://dsgvo-gesetz.de/art-15-dsgvo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:underline"
                >
                  Art. 15 DSGVO
                </a>
                ): Du hast das Recht zu erfahren, welche Daten wir über
                dich verarbeiten.
              </li>
              <li>
                <strong className="text-stone-700">Berichtigung</strong>{" "}
                (
                <a
                  href="https://dsgvo-gesetz.de/art-16-dsgvo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:underline"
                >
                  Art. 16 DSGVO
                </a>
                ): Du kannst die Korrektur unrichtiger Daten verlangen.
              </li>
              <li>
                <strong className="text-stone-700">Löschung</strong>{" "}
                (
                <a
                  href="https://dsgvo-gesetz.de/art-17-dsgvo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:underline"
                >
                  Art. 17 DSGVO
                </a>
                ): Du kannst die Löschung deiner Daten verlangen, sofern
                keine gesetzliche Aufbewahrungspflicht besteht.
              </li>
              <li>
                <strong className="text-stone-700">
                  Einschränkung der Verarbeitung
                </strong>{" "}
                (
                <a
                  href="https://dsgvo-gesetz.de/art-18-dsgvo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:underline"
                >
                  Art. 18 DSGVO
                </a>
                )
              </li>
              <li>
                <strong className="text-stone-700">
                  Widerspruch gegen die Verarbeitung
                </strong>{" "}
                (
                <a
                  href="https://dsgvo-gesetz.de/art-21-dsgvo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:underline"
                >
                  Art. 21 DSGVO
                </a>
                )
              </li>
              <li>
                <strong className="text-stone-700">
                  Datenübertragbarkeit
                </strong>{" "}
                (
                <a
                  href="https://dsgvo-gesetz.de/art-20-dsgvo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:underline"
                >
                  Art. 20 DSGVO
                </a>
                )
              </li>
            </ul>
            <p className="text-sm leading-relaxed mt-3">
              Zur Ausübung deiner Rechte wende dich bitte per E-Mail an{" "}
              <a href="mailto:hallo@dein.shop" className="text-amber-700 hover:underline">
                hallo@dein.shop
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              9. Beschwerderecht
            </h2>
            <p className="text-sm leading-relaxed">
              Du hast das Recht, bei der österreichischen
              Datenschutzbehörde Beschwerde einzulegen, wenn du der Ansicht
              bist, dass die Verarbeitung deiner Daten gegen die DSGVO
              verstößt:
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Österreichische Datenschutzbehörde
              <br />
              Barichgasse 40–42
              <br />
              1030 Wien
              <br />
              <a
                href="https://www.dsb.gv.at"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:underline"
              >
                www.dsb.gv.at
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-stone-800 mb-3">
              10. Aktualität dieser Erklärung
            </h2>
            <p className="text-sm leading-relaxed">
              Diese Datenschutzerklärung ist aktuell gültig und hat den Stand
              Februar 2026. Sie kann bei Änderungen des Angebots oder bei
              geänderten rechtlichen Anforderungen angepasst werden.
            </p>
          </section>

        </div>
      </div>
    </PageLayout>
  );
}
