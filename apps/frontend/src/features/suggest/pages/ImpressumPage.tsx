import { PageLayout } from "../../../components/layout/PageLayout.tsx";

export function ImpressumPage() {
  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Impressum</h1>
        <div className="text-gray-600 space-y-4 text-sm leading-relaxed">
          <p className="text-gray-400 italic">
            Bitte füge hier deine vollständigen Angaben gemäß § 5 TMG ein.
          </p>
          <p>
            <strong>Angaben gemäß § 5 TMG</strong>
            <br />
            [Name]
            <br />
            [Straße, Hausnummer]
            <br />
            [PLZ Ort]
          </p>
          <p>
            <strong>Kontakt</strong>
            <br />
            E-Mail: [email@example.com]
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
