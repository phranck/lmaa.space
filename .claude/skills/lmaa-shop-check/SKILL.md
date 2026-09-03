---
name: lmaa-shop-check
description: Prüft Shops nach den lmaa.space-Aufnahmekriterien.
version: 0.2.0
author: Frank Gregor (phranck), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [lmaa-space, shop, review, research]
    related_skills: []
---

# lmaa.space Shop Check

Bewerte eine Shop-URL gegen die jeweils aktuellen Aufnahmekriterien von
*lmaa.space*. Liefere bei Aufnahme importierbares JSON und bei Ablehnung die
beiden redaktionellen Texte samt belastbaren Quellen.

## When to Use

- Eine einzelne Shop-URL soll für die Aufnahme geprüft werden.
- `lmaa-shop-review` delegiert die Prüfung eines Listeneintrags.
- Nicht für den Import in die Datenbank oder die Änderung von Shopdaten nutzen.

## Prerequisites

- Eine URL oder Domain als Argument.
- Netzwerkzugriff über `web_fetch`, `web_search` und bei Bedarf `browser_exec`.
- Aktuelle Kriterien: `https://lmaa.space/admissioncriteria`
- Kategorien: `https://lmaa.space/api/v1/categories`

## Procedure

1. **Eingabe validieren.** Ergänze bei einer nackten Domain `https://`. Bei
   jeder anderen ungültigen Eingabe ende mit:
   `Bitte eine Shop-URL übergeben, z. B. "lmaa-shop-check https://example.com".`
   Abschlusskriterium: Es liegt genau eine normalisierte Shop-URL vor.

2. **Aktuelle Regeln laden.** Lade die Kriterien bei jedem Lauf neu mit
   `web_fetch`; arbeite nie aus dem Gedächtnis. Sind sie nicht erreichbar,
   ende mit `Die Aufnahmekriterien konnten nicht geladen werden. Bitte später erneut versuchen.`
   Abschlusskriterium: Alle acht aktuellen Kriterien liegen vollständig vor.

3. **Shopseiten sequenziell untersuchen.** Lies Startseite, Impressum oder
   Kontaktseite, Versand, Zahlungsinformationen, FAQ, AGB und Über-uns-Seiten
   frisch und nacheinander. Nutze `web_search` für fehlende Seiten und
   `browser_exec` für dynamische Inhalte oder Payment-Icons im DOM.
   **Wichtig:** Dokumentiere alle einzigartigen Merkmale des Shops (Auszeichnungen, Personen, besondere Services).
   Abschlusskriterium: Jede relevante shopkontrollierte Seite wurde geprüft
   oder ihre Nichterreichbarkeit dokumentiert.

4. **Sitz und Rechtsform klären.** Ermittle Rechtsträger, Sitz, Eigentum,
   Konzernbezüge und Filialstruktur. Der Rechtssitz des Unternehmens muss in
   Europa liegen, einschließlich Schweiz, Norwegen und Vereinigtem Königreich.
   Versand, Sprache, Europreise, Lager, Importeur oder Vertriebsgesellschaft in
   Europa ersetzen keinen europäischen Rechtssitz.
   Abschlusskriterium: Sitz und Sitzquelle sind belegt oder ausdrücklich unklar.

5. **Versand normalisieren.** Verwende exakt: weltweit belegt `['WORLD']`;
   andernfalls europaweit belegt `['EU']`; andernfalls nur belegte Codes aus
   `DE`, `AT`, `CH`. Kombiniere `WORLD` oder `EU` nie mit anderen Codes.
   Versand entscheidet nicht über die Aufnahme.

6. **Zahlungsmethoden belegen.** Verwende nur shopkontrollierte Quellen und nur
   diese Schlüssel: `paypal`, `credit_card`, `stripe`, `sepa`,
   `bank_transfer`, `invoice`, `klarna`, `apple_pay`, `google_pay`,
   `amazon_pay`, `visa`, `mastercard`, `american_express`, `maestro`,
   `shop_pay`. Nutze `credit_card` nur ohne erkennbares Kartennetz; sobald Visa,
   Mastercard oder American Express belegt ist, nenne die Netze statt
   `credit_card`. Keine Evidenz ergibt `[]`; das Shopsystem allein ist keine
   Evidenz.

7. **Unternehmensgröße aktiv recherchieren.** Beginne mit einer Suche nach
   `<Firmenname> die-deutsche-wirtschaft.de`; ergänze Northdata,
   Bundesanzeiger, LinkedIn-Unternehmensseite, PitchBook, Statista,
   Unternehmens- und Presseseiten. Nenne Bezugsjahr und kennzeichne Schätzungen.
   Beschäftigtenzahl ist primär: Richtwert etwa 100, klar über 150 bedeutet
   Ablehnung. Umsatz von etwa 20 Mio. Euro ist nur ein schwächeres
   Orientierungssignal. Direkt darüber sind Konzernbezug, Filialen,
   Marktstellung und Selbstdarstellung abzuwägen. Fehlen Zahlen, nutze konkrete
   Proxys wie Filialzahl, Fläche, Sortiment und Stellenanzeigen; setze nie
   automatisch "klein" voraus.

8. **Alle acht Kriterien intern bewerten.** Nutze `✓`, `✗` oder `~` für:
   eigenständiger Online-Auftritt; Sitz in Europa; kein Großunternehmen; kein
   Marktplatz; kein reines Dropshipping; keine Kette oder Warenhaus; kein reines
   Affiliate-Portal; keine rechtsextremen Verbindungen. Ein belegtes
   Ausschlusskriterium führt zu Ablehnung. Unklare Punkte werden benannt.

9. **Aufnahmedaten vervollständigen.** Nur für einen Aufnahmekandidaten:
   Lade die Kategorien-API, ermittle Kontakt-E-Mail, soziale Profile,
   Schwerpunkte und Marken/Produkte. Normalisiere verschleierte E-Mail-Adressen.
   Erfasse `street`, `postalCode`, `city`, `state`, ISO-3166-1-alpha-2-
   `countryCode` und Quelle. Geokodiere mit Photon
   `https://photon.komoot.io/api/?q={address}&limit=1` in dieser Kaskade:
   Straße+PLZ+Ort+Land, PLZ+Ort+Land, PLZ+Ort. Photon liefert
   `[longitude, latitude]`. `null` ist erst nach ausgeschöpfter Kaskade erlaubt;
   Quelle und Granularität müssen genannt sein.

10. **Ablehnung vertiefen.** Nutze mindestens fünf unabhängig überprüfbare
    Quellen. Priorität: Shopseiten; Register; Investor- oder PE-Seiten;
    Fachpresse; Finanzdatenbanken; Behördenentscheidungen; Qualitätspresse;
    Wikipedia nur ergänzend. Bei PE/VC dokumentiere die gesamte Beteiligungskette
    mit Registernummern. Bei Größe belege Beschäftigte/Umsatz samt Jahr. Bei
    Sitz außerhalb Europas kläre, wem europäische Adressen gehören.

11. **Ausgabe exakt erzeugen und validieren.** 
    **Vor der Ausgabe:** Prüfe, dass ALLE gesammelten einzigartigen Fakten (Auszeichnungen, Personen, besondere Services, Geschichte) in `description` oder `notes` eingebaut wurden. Nichts darf verloren gehen.
    Prüfe Acceptance-JSON mit einem JSON-Parser, bevor du es ausgibst.
    Abschlusskriterium: Genau eines der unten definierten Formate ist vollständig und syntaktisch gültig.

## Research and Writing Rules

- Erfinde nichts. Nicht belegte Tatsachen werden ausgelassen oder als unklar markiert.
- Schreibe nutzerseitige Texte auf Deutsch mit echten Umlauten und `ß`.
- Verwende geschlechtergerechte neutrale Formen wie `Mitarbeitende`,
  `Kundschaft` und `Betreibende`, sonst Paarformen. Keine Gendersterne oder Genderdoppelpunkte. Bezeichnungen namentlich genannter Personen bleiben unverändert.
- Verwende keine Gedankenstriche. Schreibe vollständige Sätze.
- Setze *lmaa.space* in Prosa kursiv und die erste Nennung des Shopnamens in jedem erzeugten Text fett, auch in `description`.
- Bereinige Trackingparameter wie `utm_*`, `trk`, `si`, `fbclid` und `gclid` aus URLs.
- Nutze den `todo`-Werkzeugaufruf nicht für eine einzelne Shopprüfung.

## Description Guidelines

Die `description` muss ein **lebendiges, redaktionelles Porträt** sein, das den Shop einzigartig macht. 

### Was Gesammlt werden muss (aus Shopseiten):
- **Personen:** Geschäftsführung, Gründer:innen, Schlüsselpersonen (z. B. "Mag. Verena Brunner-Loss führt den Familienbetrieb")
- **Geschichte:** Gründungsjahr, Meilensteine, Auszeichnungen (z. B. "dreimal als ausgezeichneter Lehrbetrieb prämiert")
- **Besonderheiten:** Einzigartige Dienstleistungen, lokale Verwurzelung, spezielle Sortimente (z. B. "spezialisiert auf Schulbuchvertrieb mit persönlicher Betreuung")
- **Standorte:** Physische Präsenz, Filialen, besondere Räumlichkeiten (z. B. "drei gemütliche Buchhandlungen in Bregenz, Dornbirn und Höchst")
- **Aktivitäten:** Regelmäßige Veranstaltungen, Kooperationen, Bildungsangebote (z. B. "regelmäßige Buchpräsentationen mit lokalen und internationalen Autor:innen")

### Was NICHT in description gehört:
- Marken- oder Produktlisten
- Besitzform-Floskeln ("familiengeführt" ohne Kontext)
- Register-, Steuer- oder Finanzdaten (diese gehören in `notes` oder `legal`)
- Generische Sätze ohne konkrete Fakten

### Beispiel für eine gute description:
```
Die **Buchhandlung Brunner** wird von Mag. Verena Brunner-Loss geführt und ist als geistiger Nahversorger in Vorarlberg fest verwurzelt. An drei Standorten in Bregenz, Dornbirn und Höchst bieten rund 20 ausgebildete Buchhändlerinnen und Buchhändler ein breites Sortiment von Neuerscheinungen über Klassiker bis zu buchverwandten Geschenkartikeln an. Der Betrieb wurde 2017, 2020 und 2023 als "Ausgezeichneter Lehrbetrieb" prämiert und bildet regelmäßig aus. Mit regelmäßigen Buchpräsentationen und Kooperationen mit lokalen Veranstalterinnen trägt die Buchhandlung aktiv zur lebendigen Literaturszene bei. Besonders engagiert ist sie im Schulbuchvertrieb, wo sie Bildungsinstitutionen von der ersten Bestellung bis zur Direktlieferung begleitet.
```

### Beispiel für eine mangelhafte description:
```
Die **Buchhandlung Brunner** ist eine Buchhandlung in Österreich, die Bücher verkauft.
```

## Output

Die Antwort enthält ausschließlich Daten, keine Checkliste, keine zusätzliche
Erklärung und keinen separaten Verdict-Text.

### Aufnahme

Gib genau einen JSON-Codeblock mit diesen Feldern aus:

```json
{
  "name": "Shop Name",
  "url": "https://example.com",
  "description": "Copy-ready shop description",
  "categories": [],
  "contactEmail": null,
  "shippingRegions": [],
  "paymentMethods": [],
  "legal": {
    "entityName": null,
    "entityType": null,
    "owners": [],
    "headquartersSource": null
  },
  "headquarters": {
    "street": null,
    "postalCode": null,
    "city": null,
    "state": null,
    "countryCode": null,
    "source": null
  },
  "geo": {
    "latitude": null,
    "longitude": null,
    "source": null
  },
  "socialMedia": {
    "mastodon": null,
    "bluesky": null,
    "twitter": null,
    "instagram": null,
    "tiktok": null,
    "youtube": null,
    "twitch": null,
    "pinterest": null,
    "linkedin": null,
    "facebook": null,
    "threads": null,
    "patreon": null
  },
  "notes": {
    "focus": [],
    "brandsOrProducts": [],
    "companyPresentation": null
  }
}
```

`description` ist ein kurzes redaktionelles Porträt mit Personen und Ort.
Geschichte, Herkunft, Kurse, Workshops und Anekdoten sind erwähnenswert. Keine
Marken- oder Produktlisten, Besitzform-Floskeln, Register-, Steuer- oder
Finanzdaten; diese gehören in `notes`. Absätze werden als `\n\n` kodiert.
Unbekannte Skalare sind `null`, Listen `[]`, Maps `{}`. Jeder Stringwert steht
auf einer physischen Zeile. Deutsche typografische Anführungszeichen innerhalb
eines Strings werden als `\u201E` und `\u201C` escaped.

**Wichtig:** Social Media Felder müssen vollständige URLs oder null sein. Keine fragmentarischen Benutzernamen wie "brunnerbuch" - immer die volle URL wie "https://www.instagram.com/brunnerbuch/" oder null.

### Ablehnung

Gib genau zwei Markdown-Codeblöcke aus, durch eine Leerzeile getrennt:

1. `Kommentar`: zwei bis drei neutrale Sätze, Hauptgrund klar, keine Quellen;
   danach unverändert auf eigenen Zeilen:
   `Die vollständige Begründung finden Sie unter:`
   `https://lmaa.space/rejected/[REJECT_TOKEN]`
2. `Langbegründung`: 300 bis 500 Wörter mit `## Einleitung`,
   `## Ablehnungsgründe`, passenden `###`-Unterabschnitten, `## Schluss` und
   `### Quellen`.

Konkrete Fakten erhalten Fußnoten `[^N]`. Jede Quelle ist eine überprüfbare URL
im Format `[^N]: [Beschreibung](URL), Stand: $DATUM`. Registerdaten, Sitz und
Konzernzugehörigkeit werden immer belegt. `[REJECT_TOKEN]` bleibt exakt stehen.

## Pitfalls

- Die Kategorien-API ist keine Quelle für die Aufnahmekriterien.
- Händlervertrieb, Telefon- oder E-Mail-Bestellung kann ein eigener Verkauf sein;
  ein Checkout ist nicht zwingend.
- Weltweiter Versand hilft oder schadet der Aufnahme nicht.
- Familienbesitz macht ein Unternehmen nicht klein.
- Payment-Icons können nur im Markup sichtbar sein.
- Bei unerreichbarer Kategorien-API bleibt `categories` leer; bei vollständig
  erschöpfter Geokodierung bleiben beide Koordinaten `null`.
- Social Media Felder sind entweder vollständige URLs oder null.

## Verification

- Alle acht Kriterien wurden intern mit `✓`, `✗` oder `~` bewertet.
- Ablehnung: beide Blöcke, intakter Token, 300 bis 500 Wörter und mindestens fünf
  unterschiedliche überprüfbare URLs; jede harte Tatsachenbehauptung hat eine
  Fußnote.
- Aufnahme: JSON-Parsing erfolgreich; jedes Schemafeld vorhanden oder explizit
  leer; Koordinatenkaskade ausgeschöpft; nur kanonische Versand- und
  Paymentwerte.
- **Vor der Finalisierung:** Prüfe, dass alle gesammelten Fakten (Personen, Auszeichnungen, besondere Services, Geschichte) in der Ausgabe enthalten sind. Keine relevanten Informationen dürfen verloren gehen.
