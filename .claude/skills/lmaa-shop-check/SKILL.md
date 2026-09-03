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
   Notiere dabei, was diesen Shop von anderen unterscheidet: die Menschen
   dahinter, seine Geschichte, seine Standorte, seine Besonderheiten und was er
   regelmässig veranstaltet.
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
    `description` hat drei Absätze und rund 1000 Zeichen, wie unter Description
    Guidelines beschrieben. Bleibt sie deutlich darunter, fehlen Belege aus
    Schritt 3, und du holst sie nach, statt einen dünnen Text abzuliefern. Jede
    Liste unter `notes` fasst höchstens acht Einträge.
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

Die `description` ist ein sachliches Porträt in **drei Absätzen**, durch `\n\n`
getrennt. Zwei von drei Beschreibungen im Bestand sind so gebaut, zusammen rund
1000 Zeichen und etwa acht Sätze.

**Absatz 1, rund 330 Zeichen: wer und wo.** Beginnt mit dem fett gesetzten
Shopnamen als Satzsubjekt, also `**Name** ist ein …`. Sagt, was für ein Geschäft
es ist, wo es sitzt (Ort und Region), wer es betreibt und seit wann. Der
Rechtsträger darf hierher, eine Registernummer nur, wenn sonst nichts den
Betrieb eindeutig benennt.

**Absatz 2, rund 390 Zeichen: was es gibt.** Das Sortiment, konkret. **Nenne die
Marken, die der Shop führt, beim Namen**, als Beispiele im Satz, etwa „darunter
Yamaha, Roland und Line 6". Das ist keine Stilfrage: die Shopsuche durchsucht
diese Beschreibung, und eine Marke, die hier nicht steht, findet niemand. Nenne
ausserdem die Warengruppen, für wen der Shop da ist und was ihn von anderen
unterscheidet.

**Absatz 3, rund 290 Zeichen: wie man bestellt und was sonst noch bleibt.**
Bestellwege, Versand, Ladengeschäft und Abholung. Danach, was übrig ist und
zählt: eigene Werkstatt oder Verleih, Beschäftigtenzahl, Auszeichnungen,
Lizenzen.

### Ton

Dritte Person, Präsenz, nüchtern. Keine Wir-Form, keine Anrede der Lesenden,
keine Werbesprache. Zahlen, wo sie belegt sind. Personen mit vollem Namen.

### Was nicht hineingehört

- Ein blosser Katalog. Marken gehören in ganze Sätze, nicht in eine Aufzählung ohne Verb.
- Floskeln ohne Beleg, etwa „familiengeführt" ohne zu sagen von wem.
- Sätze ohne konkrete Tatsache.

### Beispiel für eine gute description

```
**Musik Grünebaum** ist ein inhabergeführtes Musikfachgeschäft in Schwerte-Villigst im Ruhrgebiet mit Kundschaft aus Dortmund, Hagen, Iserlohn und Unna. Peter Grünebaum hat das Geschäft 1973 gegründet, heute führt sein Sohn Tim Grünebaum das Haus in zweiter Generation. Seit über 50 Jahren steht persönliche Beratung im Mittelpunkt.

Das Sortiment umfasst Gitarren und Bässe, Schlagzeuge, Keyboards und Digitalpianos, Blasinstrumente, Folkloreinstrumente, Recording- und Studio-Equipment, PA-Technik sowie Noten und Zubehör. Der Shop führt ausschließlich Markeninstrumente, darunter Yamaha, Roland, Line 6, Ovation und Sigma Guitars. Neben Verkauf bietet Musik Grünebaum einen kostenlosen Lifetime-Justierservice und einen eigenen Reparaturservice, der auch überregional genutzt wird.

Bestellt werden kann online per Warenkorb und Checkout oder direkt im Ladenlokal an der Letmather Straße. Der Versand erfolgt innerhalb Deutschlands mit DPD, Noten werden versandkostenfrei verschickt.
```

### Beispiel für eine mangelhafte description

```
Die **Musik Grünebaum** ist ein Musikgeschäft in Deutschland, das Instrumente verkauft.
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

`description` folgt dem Aufbau unter Description Guidelines. Absätze werden als
`\n\n` kodiert.
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

Konkrete Fakten erhalten Quellenverweise `[n]`. Jede Quelle ist eine überprüfbare URL
im Format `[n] URL — Beschreibung, Stand: $DATUM`. Registerdaten, Sitz und
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
  unterschiedliche überprüfbare URLs; jede harte Tatsachenbehauptung hat einen
  Quellenverweis.
- Aufnahme: JSON-Parsing erfolgreich; jedes Schemafeld vorhanden oder explizit
  leer; Koordinatenkaskade ausgeschöpft; nur kanonische Versand- und
  Paymentwerte.
- `description` hat drei Absätze, rund 1000 Zeichen, beginnt mit dem fett gesetzten Shopnamen, steht in der dritten Person und nennt die geführten Marken beim Namen. Jede Liste unter `notes` bleibt unter neun Einträgen.
