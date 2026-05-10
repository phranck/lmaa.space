# Dashboard Button Consolidation Plan

Stand: 2026-05-10

Quelle: `docs/ui-consolidation/dashboard-buttons.md` mit 155 dokumentierten Dashboard-Action-Button-Zeilen.

## Zielbild

Alle user-facing Dashboard-Action-Buttons werden auf eine einheitliche visuelle Basis konsolidiert:

- Default-Hoehe: `h-7` (28px) fuer alle Text-Action-Buttons.
- Icon-only Action-Buttons bekommen als Default `size-7`.
- Abweichungen von `h-7`/`size-7` sind keine stillen One-offs mehr, sondern muessen spaeter als explizite Ausnahme im Komponenten-API modelliert werden.
- Ein gemeinsamer visueller Primitive: `DashboardButton`.
- Wiederverwendbare Action-Komponenten fuer wiederkehrende Labels und Icon-Semantik, z. B. `SaveActionButton`, `DeleteActionButton`, `EditActionButton`, `ImportActionButton`, `ExportActionButton`.
- Label- und Icon-Entscheidungen liegen zentral in einem Action-Katalog, nicht verteilt in Feature-Dateien.
- Farben werden ebenfalls zentralisiert: Action-Komponenten waehlen eine von wenigen semantischen Farbrollen, keine Feature-spezifischen Einzelklassen.
- Jeder Action-Button bekommt ein Icon. Reine Text-Action-Buttons bleiben nicht als Sonderfall bestehen.
- Lokale i18n Keys bleiben nur dort bestehen, wo der Fachtext wirklich anders ist.

## Befund

| Messpunkt                           | Wert |
| ----------------------------------- | ---: |
| Dokumentierte Button-Zeilen         |  155 |
| Explodierte Label-Vorkommen         |  192 |
| Zeilen bereits mit `h-7` / `size-7` |    3 |
| Zeilen nicht `h-7` / `size-7`       |  152 |
| Rohe `button`-Zeilen                |  115 |
| Bereits benannte Button-Komponenten |   40 |
| Redundante Label-Gruppen            |   50 |
| Redundante Icon-Gruppen             |   24 |

## Hoehen-Normalisierung

- `auto via py-2`: 4 Zeilen
- `auto / content-based`: 24 Zeilen
- `h-8`: 9 Zeilen
- `h-9 (36px)`: 33 Zeilen
- `h-9`: 33 Zeilen
- `auto via py-1.5`: 27 Zeilen
- `h-6`: 2 Zeilen
- `h-7`: 2 Zeilen
- `h-5`: 2 Zeilen
- `auto, no fixed height`: 4 Zeilen
- `h-8 (32px)`: 14 Zeilen
- `size-7`: 1 Zeilen

Konsequenz: Die Normalisierung ist nicht kosmetisch. `h-7` wird als Default-Hoehe im Plan gesetzt und muss an den zentralen Komponenten beginnen, sonst bleiben rohe `py-*`, `h-9`, `h-8`, `h-6` und `h-5` weiter in den Features verstreut.

## Farb-Normalisierung

Die Button-Konsolidierung umfasst auch die Variantenfarben. Die Farbe wird spaeter nicht mehr lokal per Tailwind-Klasse oder Einzelfall-Styling entschieden, sondern ueber eine zentrale `DashboardButtonVariant`.

| Farbrolle | Einsatz                                                   | Ziel-Actions                                          |
| --------- | --------------------------------------------------------- | ----------------------------------------------------- |
| `primary` | Primaere Commit- oder Create-Aktion im aktuellen Kontext. | `save`, `create`                                      |
| `neutral` | Sekundaere, navigierende oder nicht-destruktive Aktionen. | `edit`, `cancel`, `close`, `import`, `export`, `copy` |
| `danger`  | Destruktive oder ablehnende Aktion.                       | `delete`, `remove`, `reject`, `skip`                  |
| `success` | Positiver Workflow-Abschluss oder Wiederherstellung.      | `approve`, `restore`                                  |
| `warning` | Risiko-, Konflikt- oder Halteaktion.                      | `hold`, `overwrite`                                   |

Konsequenz: `Importieren` und `Exportieren` sind keine Erfolgs- oder Primaerfarben mehr nur wegen ihrer technischen Richtung. `Überschreiben` wird nicht als primaere Aktion gefaerbt, sondern als Warnaktion. Alle Farbwerte muessen aus zentralen Tokens fuer Text, Border, Hover und Focus Ring kommen.

## Explizite Komponenten-Ausnahmen

Ausnahmen sind zulaessig, aber nicht als lokale Klassen in Feature-Dateien. Jede Ausnahme muss spaeter als benannter Modus oder dedizierter Wrapper im zentralen Button-API modelliert werden.

| Ausnahme                    | API-Modellierung                                                               | Erlaubte Abweichung                                                                        | Beispiele                                                                  | Gate                                                                     |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Icon-only Aktionen          | `DashboardIconButton` oder `DashboardActionButton display="icon"`              | Kein sichtbares Label, Default `size-7`, zwingend `aria-label`.                            | Sidebar auf-/zuklappen, Bild aktiv setzen, kompakte Tabellenwerkzeuge.     | Sichtbarer Tooltip oder ARIA-Label muss aus i18n kommen.                 |
| File-Input Trigger          | `ImportFileButton` als Behavior-Wrapper um `DashboardActionButton`             | Hidden `<input type="file">`, visuell trotzdem `h-7` und zentrale Farbrolle.               | JSON importieren, Template importieren.                                    | Der sichtbare Button darf keine eigenen Hoehen- oder Farbklassen setzen. |
| Status-Buttons              | `DashboardActionButton status="idle                                            | pending                                                                                    | success                                                                    | error"`                                                                  | Label, Icon und Disabled-State duerfen statusabhaengig wechseln. Hoehe und Farbrolle bleiben zentral. | Speichern, Wird gespeichert, Gespeichert, Wird gelöscht. | Status-Texte muessen zentral im Action-Katalog oder in klaren Status-Keys liegen. |
| Header-/Navigationsaktionen | Dedizierter Wrapper wie `HeaderBackButton`, intern auf `DashboardActionButton` | Layout darf sich an Header-Typografie ausrichten, Hit-Zone bleibt mindestens `h-7`.        | Zurueck zu Seiten, E-Mail-Templates, Formulare.                            | Keine freie Auto-Hoehe ohne dokumentierten Wrapper.                      |
| Toggle-/Auswahlaktionen     | `DashboardActionButton pressed` oder `DashboardIconButton pressed`             | Aktiver Zustand darf Icon, ARIA und Tone ergaenzen. Grundhoehe bleibt `h-7` bzw. `size-7`. | Als aktives Bild setzen, Fuer Rotation aktivieren, Gruppen auf-/zuklappen. | `aria-pressed` oder aequivalenter Zustand muss gesetzt sein.             |

Konsequenz: Wenn eine Feature-Datei eine andere Hoehe, Farbe, Icon-Platzierung oder Label-Logik braucht, wird zuerst geprueft, ob eine dieser Ausnahmen passt. Passt keine, wird eine neue Ausnahme im Action-Katalog ergaenzt, bevor Code migriert wird.

## Vorgeschlagene Architektur

1. `apps/dashboard/src/components/ui/DashboardButton.tsx` einfuehren, mit `h-7` als Default-Hoehe.
2. `TableActionButton`, `EditorToolbarButton`, `ImportButton`, `ExportButton` und `HeaderBackButton` intern auf `DashboardButton` umstellen.
3. `apps/dashboard/src/components/ui/DashboardActionButton.tsx` einfuehren, als generischen Renderer fuer Action-Katalog-Eintraege.
4. `apps/dashboard/src/components/ui/action-buttons.tsx` einfuehren.
5. Zentralen Action-Katalog anlegen: Action -> Label-Key, Default-Icon, Farbrolle, Default-Hoehe, ARIA-Verhalten, erlaubte Ausnahme.
6. Feature-Dateien schrittweise von lokalen Klassen und lokalen Label-Keys auf `DashboardActionButton` oder duenner Wrapper-Komponenten migrieren.
7. Danach obsolete i18n Keys aus `apps/dashboard/src/i18n/messages.ts` entfernen.

## Ziel-Komponenten

| Action      | Neue Komponente         | Ziel-Label                 | Ziel-Key           | Icon                        | Variante  | Betroffene Vorkommen | Entscheidung                                                                                                                        |
| ----------- | ----------------------- | -------------------------- | ------------------ | --------------------------- | --------- | -------------------: | ----------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `save`      | `SaveActionButton`      | Speichern                  | `common.save`      | `FloppyDiskIcon`            | `primary` |                   13 | Ein Button mit status="idle                                                                                                         | pending | saved". Lokale Save-Keys werden nur behalten, wenn der Fachtext wirklich abweicht. |
| `delete`    | `DeleteActionButton`    | Löschen                    | `common.delete`    | `TrashIcon`                 | `danger`  |                   14 | Destruktive Objektlöschung. Bestätigungsdialoge verwenden denselben Action-Button im Footer.                                        |
| `remove`    | `RemoveActionButton`    | Entfernen                  | `common.remove`    | `TrashIcon`                 | `danger`  |                    5 | Semantisch getrennt von Delete, aber gleicher h-7-Button und gleiche Icon-Konvention.                                               |
| `edit`      | `EditActionButton`      | Bearbeiten                 | `common.edit`      | `PencilSimpleIcon`          | `neutral` |                    9 | Einheitlich PencilSimpleIcon. FileTextIcon nur behalten, wenn damit „Dokument öffnen“ statt „Bearbeiten“ gemeint ist.               |
| `cancel`    | `CancelActionButton`    | Abbrechen                  | `common.cancel`    | `XIcon`                     | `neutral` |                    4 | Nur Komponente konsolidieren, Key ist bereits zentral.                                                                              |
| `close`     | `CloseActionButton`     | Schließen                  | `common.close`     | `XIcon`                     | `neutral` |                    2 | Lokalen Help-Key entfernen, wenn kein anderer Wortlaut benötigt wird.                                                               |
| `import`    | `ImportActionButton`    | Importieren                | `common.import`    | `DownloadSimpleIcon`        | `neutral` |                    3 | ImportFileButton behält File-Input-Verhalten, rendert innen denselben h-7-ActionButton.                                             |
| `export`    | `ExportActionButton`    | Exportieren                | `common.export`    | `UploadSimpleIcon`          | `neutral` |                    5 | ExportButton und TableActionButton teilen dieselbe Action-Konfiguration.                                                            |
| `create`    | `CreateActionButton`    | Neu / Erstellen            | `common.create`    | `PlusCircleIcon`            | `primary` |                   19 | Parametrisierter subjectKey: „Neue Seite“, „Neues Template“, „Benutzer erstellen“. Generischer Button stellt Icon, Höhe und Status. |
| `reject`    | `RejectActionButton`    | Ablehnen                   | `common.reject`    | `XCircleIcon`               | `danger`  |                    4 | Workflow-Action mit einheitlichem Icon und Variantenfarbe.                                                                          |
| `approve`   | `ApproveActionButton`   | Freischalten / Akzeptieren | `common.approve`   | `CheckCircleIcon`           | `success` |                    3 | Semantik prüfen: Resolve kann eigene action bleiben, aber gleicher Button-Primitive.                                                |
| `restore`   | `RestoreActionButton`   | Wiederherstellen           | `common.restore`   | `ArrowCounterClockwiseIcon` | `success` |                    2 | Lokale Keys durch einen zentralen Workflow-Key ersetzen.                                                                            |
| `hold`      | `HoldActionButton`      | Zurückstellen              | `common.putOnHold` | `PauseCircleIcon`           | `warning` |                    2 | Einheitliche Benennung und Icon-Verwendung.                                                                                         |
| `overwrite` | `OverwriteActionButton` | Überschreiben              | `common.overwrite` | `ArrowsClockwiseIcon`       | `warning` |                    2 | Konfliktdialoge teilen denselben Button-Satz.                                                                                       |
| `skip`      | `SkipActionButton`      | Überspringen               | `common.skip`      | `SkipForwardIcon`           | `danger`  |                    2 | Konfliktdialoge teilen denselben Button-Satz.                                                                                       |
| `copy`      | `CopyActionButton`      | Kopieren                   | `common.copy`      | `CopyIcon`                  | `neutral` |                    8 | Copy vs Duplicate semantisch getrennt halten; Status copied als Prop abbilden.                                                      |

## Label-Redundanzen

| Label                   | Vorkommen | Verschiedene Keys | Icons                                                            | Komponenten                                              | Aktuelle Hoehen                                                                      |
| ----------------------- | --------: | ----------------: | ---------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Löschen                 |        14 |                13 | `TrashIcon`                                                      | `button`<br>`TableActionButton`<br>`EditorToolbarButton` | `h-9 (36px)`<br>`auto via py-1.5`<br>`h-9`<br>`auto / content-based`<br>`h-8 (32px)` |
| Speichern               |        13 |                10 | `DownloadIcon`<br>`FloppyDiskIcon`                               | `button`<br>`EditorToolbarButton`                        | `auto via py-1.5`<br>`h-9`<br>`h-8`<br>`h-8 (32px)`<br>`h-9 (36px)`                  |
| Wird gespeichert…       |        13 |                10 | `DownloadIcon`<br>`ClockIcon`<br>`TrashIcon`<br>`FloppyDiskIcon` | `button`<br>`TableActionButton`                          | `auto via py-1.5`<br>`h-9`<br>`auto / content-based`<br>`h-9 (36px)`<br>`h-8`        |
| Bearbeiten              |         9 |                 7 | `FileTextIcon`<br>`PencilSimpleIcon`                             | `button`<br>`TableActionButton`                          | `auto via py-1.5`<br>`h-9 (36px)`<br>`auto / content-based`                          |
| Entfernen               |         5 |                 4 | `TrashIcon`                                                      | `button`                                                 | `h-8`<br>`h-9 (36px)`<br>`auto via py-1.5`                                           |
| Exportieren             |         5 |                 4 | `UploadSimpleIcon`<br>`UploadIcon`                               | `ExportButton`<br>`TableActionButton`<br>`button`        | `h-9 (36px)`<br>`auto via py-1.5`                                                    |
| Ablehnen                |         4 |                 3 | `XCircleIcon`                                                    | `button`<br>`EditorToolbarButton`<br>`TableActionButton` | `auto via py-1.5`<br>`h-8 (32px)`<br>`h-9 (36px)`                                    |
| Abbrechen               |         4 |                 1 | none                                                             | `button`                                                 | `h-9 (36px)`<br>`auto via py-1.5`<br>`auto / content-based`<br>`h-9`                 |
| Importieren             |         3 |                 3 | `DownloadSimpleIcon`<br>`DownloadIcon`                           | `ImportButton`<br>`button`                               | `h-9 (36px)`<br>`auto via py-1.5`                                                    |
| Erstellen               |         2 |                 4 | `PlusCircleIcon`                                                 | `button`                                                 | `auto via py-1.5`<br>`h-9 (36px)`                                                    |
| Gespeichert             |         2 |                 4 | `DownloadIcon`                                                   | `button`                                                 | `h-8`                                                                                |
| Wird erstellt…          |         2 |                 4 | `PlusCircleIcon`                                                 | `button`                                                 | `auto via py-1.5`<br>`h-9`                                                           |
| Wird gelöscht…          |         2 |                 3 | `TrashIcon`                                                      | `button`                                                 | `auto / content-based`<br>`auto via py-1.5`                                          |
| Abmelden                |         2 |                 2 | `SignOutIcon`                                                    | `button`                                                 | `h-9 (36px)`<br>`auto / content-based`                                               |
| Alle exportieren        |         2 |                 2 | `UploadIcon`                                                     | `button`                                                 | `auto via py-1.5`                                                                    |
| Neues Template          |         2 |                 2 | `PlusCircleIcon`                                                 | `button`                                                 | `h-9`                                                                                |
| Schließen               |         2 |                 2 | none                                                             | `button`                                                 | `h-9 (36px)`<br>`auto via py-1.5`                                                    |
| Template löschen        |         2 |                 2 | `TrashIcon`                                                      | `TableActionButton`                                      | `h-9 (36px)`                                                                         |
| Überschreiben           |         2 |                 2 | none                                                             | `button`                                                 | `h-9`                                                                                |
| Überspringen            |         2 |                 2 | none                                                             | `button`                                                 | `h-9 (36px)`                                                                         |
| Wiederherstellen        |         2 |                 2 | `ArrowCounterClockwiseIcon`                                      | `EditorToolbarButton`                                    | `h-8 (32px)`                                                                         |
| Zurückstellen           |         2 |                 2 | `PauseCircleIcon`                                                | `EditorToolbarButton`                                    | `h-8 (32px)`                                                                         |
| Vorschau                |         2 |                 1 | `EyeIcon`                                                        | `button`                                                 | `auto / content-based`<br>`h-8`                                                      |
| Alle Gruppen aufklappen |         1 |                 4 | `CaretCircleDoubleDownIcon`<br>`CaretCircleDoubleUpIcon`         | `button`                                                 | `h-8`                                                                                |
| Alle Gruppen zuklappen  |         1 |                 4 | `CaretCircleDoubleDownIcon`<br>`CaretCircleDoubleUpIcon`         | `button`                                                 | `h-8`                                                                                |
| Alles aufklappen        |         1 |                 4 | `CaretCircleDoubleDownIcon`<br>`CaretCircleDoubleUpIcon`         | `button`                                                 | `h-8`                                                                                |
| Alles zuklappen         |         1 |                 4 | `CaretCircleDoubleDownIcon`<br>`CaretCircleDoubleUpIcon`         | `button`                                                 | `h-8`                                                                                |
| Als aktives Bild setzen |         1 |                 3 | `CircleIcon`<br>`CheckCircleIcon`                                | `button`                                                 | `h-8`                                                                                |

## Icon-Redundanzen

| Icon                        | Vorkommen | Labels | Verschiedene Keys | Komponenten                                              | Aktuelle Hoehen                                                                                         |
| --------------------------- | --------: | -----: | ----------------: | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `TrashIcon`                 |        22 |      7 |                17 | `button`<br>`TableActionButton`<br>`EditorToolbarButton` | `auto via py-1.5`<br>`h-8`<br>`h-9 (36px)`<br>`h-9`<br>`auto / content-based`<br>`h-8 (32px)`           |
| `PlusCircleIcon`            |        19 |     16 |                17 | `button`                                                 | `auto via py-1.5`<br>`auto via py-2`<br>`h-5`<br>`h-9`<br>`h-8`<br>`auto / content-based`<br>+1 weitere |
| `DownloadIcon`              |        17 |      5 |                 9 | `button`<br>`EditorToolbarButton`                        | `auto via py-1.5`<br>`h-9`<br>`h-8`<br>`h-8 (32px)`                                                     |
| `CheckCircleIcon`           |        10 |      6 |                 5 | `button`<br>`EditorToolbarButton`<br>`TableActionButton` | `h-8`<br>`h-9`<br>`h-8 (32px)`<br>`h-9 (36px)`<br>`size-7`                                              |
| `CopyIcon`                  |         8 |      6 |                 6 | `button`                                                 | `auto / content-based`<br>`h-9`<br>`size-7`                                                             |
| `FileTextIcon`              |         7 |      2 |                 7 | `button`<br>`TableActionButton`<br>`EditorToolbarButton` | `auto via py-1.5`<br>`h-9 (36px)`<br>`h-8 (32px)`                                                       |
| `XCircleIcon`               |         6 |      2 |                 4 | `button`<br>`EditorToolbarButton`<br>`TableActionButton` | `auto / content-based`<br>`auto via py-1.5`<br>`h-8 (32px)`<br>`h-9 (36px)`                             |
| `UploadIcon`                |         5 |      2 |                 4 | `TableActionButton`<br>`button`                          | `h-9 (36px)`<br>`auto via py-1.5`                                                                       |
| `ArrowCounterClockwiseIcon` |         4 |      3 |                 4 | `EditorToolbarButton`<br>`TableActionButton`             | `h-8 (32px)`<br>`h-9 (36px)`                                                                            |
| `CaretCircleDoubleDownIcon` |         4 |      4 |                 4 | `button`                                                 | `h-8`                                                                                                   |
| `CaretCircleDoubleUpIcon`   |         4 |      4 |                 4 | `button`                                                 | `h-8`                                                                                                   |
| `CaretLeftIcon`             |         4 |      4 |                 4 | `HeaderBackButton`                                       | `auto, no fixed height`                                                                                 |
| `CaretDownIcon`             |         3 |      3 |                 3 | `button`                                                 | `auto / content-based`<br>`h-9`                                                                         |
| `CircleIcon`                |         3 |      3 |                 3 | `button`                                                 | `h-8`                                                                                                   |
| `UploadSimpleIcon`          |         3 |      2 |                 3 | `button`<br>`ExportButton`                               | `h-9`<br>`h-9 (36px)`                                                                                   |
| `ActiveBadge`               |         2 |      2 |                 2 | `button`                                                 | `auto / content-based`                                                                                  |
| `DownloadSimpleIcon`        |         2 |      1 |                 2 | `ImportButton`                                           | `h-9 (36px)`                                                                                            |
| `FloppyDiskIcon`            |         2 |      2 |                 2 | `button`                                                 | `h-9`                                                                                                   |
| `ListIcon`                  |         2 |      2 |                 2 | `button`                                                 | `auto / content-based`                                                                                  |
| `PencilSimpleIcon`          |         2 |      1 |                 2 | `TableActionButton`                                      | `h-9 (36px)`                                                                                            |

## Migrationsreihenfolge

### Phase 1: Button-Primitive mit `h-7` Default einführen

- Scope: Neuer `DashboardButton` plus `DashboardIconButton` als einzige visuelle Basis fuer Action-Buttons. Default ist `h-7`; icon-only Default ist `size-7`; Variantenfarben kommen aus zentralen Tokens.
- Dateien: `apps/dashboard/src/components/ui/DashboardButton.tsx`
- Risiko: Niedrig, wenn zuerst bestehende TableActionButton/EditorToolbarButton intern umgestellt werden.

### Phase 2: Bestehende Buttons auf Default-Hoehe und Ausnahmen mappen

- Scope: `TableActionButton`, `ImportButton`, `ExportButton`, `HeaderBackButton` und rohe Action-Buttons auf den neuen Default `h-7` bzw. `size-7` normalisieren; echte Sonderfaelle einer dokumentierten Ausnahme zuordnen.
- Dateien: `components/ui/*Button.tsx und danach Feature-Dateien`
- Risiko: Mittel: Dialogfooter und enge Toolbar-Bereiche muessen visuell geprueft werden.

### Phase 3: Action- und Farb-Katalog aufbauen

- Scope: `ACTION_BUTTONS` mappt generische Actions auf Label-Key, Icon, Farbrolle und Default-Aria.
- Dateien: `components/ui/action-buttons.tsx, i18n/messages.ts`
- Risiko: Mittel: i18n-Vertrag muss DE/EN vollstaendig bleiben.

### Phase 4: High-duplication Migration

- Scope: Zuerst Save/Delete/Edit/Import/Export/Create, danach Workflow- und Konfliktbuttons.
- Dateien: `features/content, features/overview, features/system, features/templates`
- Risiko: Mittel bis hoch wegen grossem Beruehrungsumfang.

### Phase 5: Dead keys entfernen

- Scope: Nicht mehr referenzierte Label-Keys aus `DashboardMessages`, `de` und `en` entfernen.
- Dateien: `apps/dashboard/src/i18n/messages.ts`
- Risiko: Mittel: Typecheck muss fehlende Keys sofort sichtbar machen.

### Phase 6: QA und Regression

- Scope: Typecheck, Lint, relevante UI-Screens, Screenshot-Vergleich fuer Dialoge, Tabellen, Toolbar und Header.
- Dateien: `npm/pnpm scripts plus Browser/Playwright`
- Risiko: Niedrig, wenn jede Migrationsscheibe separat verifiziert wird.

## Gates

- `tsc`/Typecheck muss alle entfernten i18n Keys abfangen.
- Lint/Format fuer geaenderte Dashboard-Dateien.
- UI-Pruefung fuer mindestens diese Flaechen: Tabellenaktionen, Editor-Toolbar, Dialog-Footer, Import/Export-Leisten, HeaderBackButton, kompakte Cards.
- Screenshot-Pruefung vor/nach der `h-7`-Default-Hoehe fuer dichte Bereiche.
- Screenshot-Pruefung der Farbrollen in hellen und dichten Bereichen: Primary, Neutral, Danger, Success, Warning.
- Keine Entfernung semantisch unterschiedlicher Labels ohne fachliche Pruefung: `Löschen` vs. `Entfernen`, `Freischalten` vs. `Akzeptieren`, `Importieren` vs. `Template importieren`.
- Keine neue Hoehen-, Farb- oder Icon-Ausnahme ohne Eintrag im Action-Katalog und ohne dokumentierten Wrapper oder Modus.
