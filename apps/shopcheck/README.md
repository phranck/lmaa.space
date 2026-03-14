# @lmaa/shopcheck

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude_API-Haiku_&_Sonnet-cc785c)
[![Shopcheck CI](https://github.com/phranck/lmaa.space/actions/workflows/shopcheck.yml/badge.svg)](https://github.com/phranck/lmaa.space/actions/workflows/shopcheck.yml)

Terminal-basiertes Evaluierungs-Tool fuer Online-Shops im [lmaa.space](https://lmaa.space)-Verzeichnis. Prueft Shops automatisiert gegen die aktuellen Aufnahmekriterien und erzeugt strukturierte JSON-Ergebnisse, die direkt ins Dashboard importiert werden koennen.

## Was macht das Tool?

Shopcheck nimmt eine Liste offener Shop-Vorschlaege aus der Datenbank (oder eine einzelne URL) und prueft jeden Shop in einer mehrstufigen Pipeline:

1. **Crawling** - Relevante Seiten des Shops werden gezielt abgerufen: Homepage, Impressum, Kontakt, Versand, About-Seite. Links werden von der Homepage aus entdeckt, fehlende Kategorien durch statische Fallback-Pfade ergaenzt.

2. **Deterministische Extraktion** - Aus dem HTML und Text der gecrawlten Seiten werden ohne LLM-Einsatz Fakten extrahiert: E-Mail-Adressen, Telefonnummern, Rechtsform, Social-Media-Profile, Versandregionen, Ausschlusssignale (Marketplace, Dropshipping, Affiliate), und Links zu Partnerprogrammen. E-Mail-Domains werden gegen die [Public Suffix List](https://publicsuffix.org) via `tldts` validiert.

3. **Web-Search Fallback** - Wenn die direkte Crawling-Phase nicht genuegend Informationen liefert (fehlende Adresse, keine E-Mail, keine Versandregionen), wird eine gezielte Web-Suche als Ergaenzung gestartet.

4. **LLM-Analyse** - Claude Haiku analysiert die gesammelten Seiten und extrahiert, was deterministisch nicht zuverlaessig moeglich ist: Adresse, Inhaber, Sortiment-Fokus, Marken, Unternehmensdarstellung. Gleichzeitig bewertet das LLM jeden Shop gegen die 9 Aufnahmekriterien von lmaa.space und ordnet passende Kategorien aus dem aktuellen Katalog zu.

5. **Geocoding** - Die ermittelte Adresse wird ueber Nominatim geocodiert. Bei unvollstaendiger Adresse greift eine Fallback-Kaskade: volle Adresse, dann PLZ+Ort, dann nur Ort.

6. **Beschreibung** - Claude Sonnet generiert eine ausfuehrliche, redaktionelle Shopbeschreibung auf Deutsch. Die Beschreibung folgt festen Stilregeln: aktive Sprache, keine Wiederholungen, konkrete Details aus den Quelltexten.

Die Ergebnisse (Fakten, Kriterien-Bewertung, Kategorien, Beschreibung, Geodaten) werden als strukturiertes JSON in `results.json` geschrieben und als Markdown-Report pro Shop in `reports/` abgelegt.

## Zwei-Modell-Strategie

| Aufgabe | Modell | Temperatur |
|---------|--------|------------|
| Faktenextraktion, Kriterien, Kategorien | Claude Haiku | 0.1 |
| Shopbeschreibung | Claude Sonnet | 0.3 |

Haiku ist schnell und guenstig fuer strukturierte Extraktion. Sonnet liefert die sprachliche Qualitaet fuer die oeffentlichen Beschreibungen.

## Benutzung

```bash
# Einzelne URL pruefen
shopcheck --url https://example-shop.de

# Batch aus der Datenbank (z.B. 5 Shops)
shopcheck --batch 5

# Status anzeigen
shopcheck --status

# Lokalen State zuruecksetzen
shopcheck --reset
```

Die TUI zeigt Fortschritt pro Shop mit Pipeline-Phasen, Live-Log und interaktiver Batch-Auswahl. Bei vorhandenem Zwischenstand wird Resume angeboten.

## Voraussetzungen

- `ANTHROPIC_API_KEY` als Umgebungsvariable
- PostgreSQL-Zugang fuer den Batch-Modus (lokale DB oder Zerops VPN)

## Tests

```bash
npm test -w @lmaa/shopcheck
```
