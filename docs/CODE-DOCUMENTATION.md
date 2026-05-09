# Code-Dokumentationsstandard

## Ziel

- Öffentliche APIs sollen ohne Quellcode-Lesen verständlich sein.
- Dokumentation soll wartbar bleiben und mit Refactorings mitziehen.

## Muss-Regeln

- Jeder öffentliche Export aus `packages/shared`, `packages/contracts` und `packages/ui`, der über den jeweiligen Package-Entry-Point erreichbar ist, erhält eine TSDoc-Beschreibung.
- App-interne Exporte in `apps/backend/src`, `apps/frontend/src` und `apps/dashboard/src` brauchen TSDoc, wenn sie eine wiederverwendbare Modul-API, einen fachlichen Vertrag oder nicht offensichtliches Verhalten bereitstellen. Rein lokale Komponenten, Hooks und Test-Utilities müssen nicht pauschal dokumentiert werden.
- Für Funktionen: Zweck, Parameter (`@param`) und Rückgabe (`@returns`) dokumentieren.
- Für Konfigurationen/Schemas: fachlichen Zweck und erwartete Datenform erklären.
- Für UI-Komponenten: Verantwortlichkeit, zentrale Props und Varianten beschreiben.
- Kommentare beschreiben **Warum/Vertrag**, nicht offensichtliche Implementation.

## Struktur pro Kommentar

- Kurzbeschreibung in einem Satz.
- Optional zweiter Absatz für Kontext/Verhalten.
- Tags nur wenn sinnvoll: `@param`, `@returns`, `@example`.

## Tooling

- Code-API-Doku generieren mit:
  - `npm run docs:code`
- Code-API-Doku ohne Schreibzugriff validieren mit:
  - `npm run docs:code:check`
- `npm run ci:quality` führt `docs:code:check` aus und behandelt TypeDoc-Validierungswarnungen als Fehler.
- TypeDoc liest Konfiguration aus `typedoc.json` und erzeugt Output in:
  - `docs/reference/code`

## Definition of Done

- Neue öffentliche Package-Exporte ohne TSDoc gelten als unvollständig.
- Bei Breaking Changes werden TSDoc und Modul-README im selben PR angepasst.
