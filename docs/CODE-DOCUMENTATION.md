# Code-Dokumentationsstandard

## Ziel
- Öffentliche APIs sollen ohne Quellcode-Lesen verständlich sein.
- Dokumentation soll wartbar bleiben und mit Refactorings mitziehen.

## Muss-Regeln
- Jeder `export` in `packages/shared`, `packages/contracts`, `packages/ui`, `apps/backend/src`, `apps/frontend/src` und `apps/dashboard/src` erhält eine TSDoc-Beschreibung.
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
- TypeDoc liest Konfiguration aus `typedoc.json` und erzeugt Output in:
  - `docs/reference/code`

## Definition of Done
- Neue Exporte ohne TSDoc gelten als unvollständig.
- Bei Breaking Changes werden TSDoc und Modul-README im selben PR angepasst.
