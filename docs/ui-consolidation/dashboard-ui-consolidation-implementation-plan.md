# Dashboard UI Consolidation Implementation Plan

Stand: 2026-05-10

Quelle:

- `docs/ui-consolidation/dashboard-buttons.md`
- `docs/ui-consolidation/dashboard-button-consolidation-plan.md`
- `docs/ui-consolidation/dashboard-ui-component-consolidation-plan.md`
- aktueller Code in `apps/dashboard/src`, `packages/ui/src` und `packages/shared/styles/tokens.css`

Dieser Plan ist die Umsetzungsreihenfolge fuer die Dashboard-UI-Konsolidierung. Er ersetzt nicht die fachlichen Zielplaene, sondern ordnet sie in migrationsfaehige Stufen. Ziel ist, Redundanzen zu reduzieren, ohne die UI durch unkoordinierte Einzelmigrationen in neue Drift zu treiben.

## Leitentscheidungen

- Action-Buttons bleiben eine eigene Linie: `h-7` fuer Text-Actions, `size-7` fuer icon-only.
- Standard-Controls bleiben eine eigene Linie: `h-8` fuer Inputs, Select-/Combobox-Trigger, Dropdown-/Menu-/Listbox-Items und Content-Tabs.
- Sichtbare Selects und Dropdowns werden Custom-Controls. Native `<select>` sind nur als bewusst markierter Hidden-Fallback oder technischer State-Anker erlaubt.
- `h-9` ist keine Default-Hoehe mehr. `h-9` bleibt nur fuer explizite `large`-/Editor-/Kalender-Ausnahmen.
- Tabs, Segments, Toggles, Table-Sort-Header, Drag-Handles und Menu-Items sind keine `DashboardActionButton`-Varianten.
- Gemeinsame Farben, Fokus-Ringe, Hover-States, Disabled-States, Radii, Z-Index-Werte und Hoehen kommen aus Foundation-Tokens.
- Jede Abweichung braucht einen benannten Modus, Wrapper oder Katalogeintrag. Lokale Feature-Klassen sind keine Ausnahmebeschreibung.

## Reihenfolge

| Stufe | Scope                                | Hauptdateien                                                                                                   | Ergebnis                                      | Gate                                                             |
| ----- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| 0     | Baseline und Schutzrails             | Docs, Scripts, aktuelle Screens                                                                                | aktueller Ist-Zustand ist messbar             | Typecheck/Lint/Build gruener oder dokumentierter Baseline-Status |
| 1     | Token- und Foundation-Basis          | `packages/shared/styles/tokens.css`, `packages/ui/src/FormPrimitives.tsx`                                      | zentrale Hoehen, Fokus, Radius, Farben        | keine visuelle Feature-Migration ohne Tokens                     |
| 2     | Shared Primitives                    | `packages/ui/src/*`                                                                                            | framework-nahe Primitives ohne Dashboard-i18n | `@lmaa/ui` typecheck/lint                                        |
| 3     | Dashboard Wrapper und Action-Katalog | `apps/dashboard/src/components/ui/*`, `apps/dashboard/src/i18n/messages.ts`                                    | app-spezifische Komponenten und i18n-Vertrag  | Dashboard typecheck                                              |
| 4     | Bestehende Button-Komponenten        | `TableActionButton`, `EditorToolbarButton`, `ImportButton`, `ExportButton`, `HeaderBackButton`, Dialog Buttons | Actions auf `h-7`/`size-7` normalisiert       | Screenshot-Vergleich fuer Tabellen, Toolbars, Dialoge            |
| 5     | Control-Primitives migrieren         | Dropdown, Selects, Inputs, Tabs, Segments, Toggles, Menus, Sort, DND                                           | sichtbare Controls nutzen zentrale Wrapper    | statische `rg`-Gates plus UI-Pruefung                            |
| 6     | Feature-Slices migrieren             | Form Builder, Submissions, System, Content, Media, Users                                                       | lokale Klassen verschwinden aus Features      | Slice-spezifische Regression                                     |
| 7     | Cleanup                              | i18n, Exporte, alte Klassen, tote Komponenten                                                                  | keine parallelen alten APIs                   | Dead-Code- und Key-Pruefung                                      |
| 8     | Abschluss-QA                         | Dashboard Build, Screenshots, Docs                                                                             | konsolidierte UI ist nachweisbar stabil       | finales Quality-Gate                                             |

## Umsetzungs-Checkliste

Pflege-Regel: Diese Checkliste ist der Arbeitsstand fuer die Umsetzung. Wenn ich nach diesem Plan arbeite, aktualisiere ich erledigte Punkte, Blocker und neu entdeckte Teilaufgaben direkt in diesem Dokument. Ein Punkt wird erst abgehakt, wenn Code, Gates und relevante UI-Pruefung fuer den jeweiligen Scope abgeschlossen sind.

### Vorbereitung

- [x] Konsolidierungsdokumente in `docs/ui-consolidation/` gebuendelt.
- [x] Button-Inventar, Button-Plan und UI-Component-Plan in der Uebersicht verlinkt.
- [x] Mehrstufiger Umsetzungsplan erstellt.
- [x] Baseline-Status fuer aktuelle Typecheck-/Lint-/Build-Gates dokumentieren.
- [x] Baseline-Screenshots fuer Tabellen, Dialoge, Toolbar, Form Builder, Dropdowns und Light/Dark Mode ablegen oder referenzieren.
- [x] Aktuelles Button- und Control-Inventar gegen den Code neu bestaetigen.

### Stufe 1: Tokens und Foundation

- [x] Control-Size-Tokens in `packages/shared/styles/tokens.css` ergaenzen.
- [x] Focus-/Interaction-Tokens ergaenzen.
- [x] Overlay-/Popover-Tokens ergaenzen.
- [x] Fehlende oder driftende Tokens wie `--ds-border-focus`, `--ds-bg-hover`, `--ds-nav-hover-bg` und `--ds-surface-hover` klaeren.
- [x] `formInputClass` auf `h-8` vorbereiten.
- [x] Textareas aus fixer Input-Hoehe herausloesen.
- [x] Dialog-Button-Klassen als Legacy markieren.
- [x] `@lmaa/ui` und Dashboard nach Token-Aenderungen pruefen.

### Stufe 2: Shared Primitives

- [x] `ButtonPrimitive` und `IconButtonPrimitive` anlegen.
- [ ] `FieldShell`, `InputPrimitive` und `TextareaPrimitive` anlegen.
- [ ] `ControlTrigger`, `ListboxPopover` und `ListboxOption` anlegen.
- [ ] `MenuPrimitive` und `MenuItemPrimitive` anlegen.
- [ ] `TabsPrimitive` mit roving tabindex und Arrow-Key-Verhalten anlegen.
- [ ] `SegmentedControlPrimitive` anlegen.
- [ ] `SwitchPrimitive` und `CheckboxPrimitive` anlegen.
- [ ] `DialogFooterPrimitive` und `SurfacePrimitive` anlegen.
- [ ] `packages/ui/src/FormPrimitives.tsx` auf Foundation umbauen.
- [ ] `packages/ui/src/Tabs.tsx` auf `TabsPrimitive` umbauen.
- [ ] `packages/ui/src/ToggleSwitch.tsx` auf `SwitchPrimitive` umbauen.
- [ ] `packages/ui/src/MultiSelect.tsx`, `CountryCodeSelect.tsx` und `RegionSelect.tsx` auf Listbox-/Popover-Foundation vorbereiten.
- [ ] `npm run typecheck -w @lmaa/ui` ausfuehren.
- [ ] `npm run lint -w @lmaa/ui` ausfuehren.

### Stufe 3: Dashboard Wrapper und Action-Katalog

- [ ] `DashboardButton` anlegen.
- [ ] `DashboardIconButton` anlegen.
- [ ] `DashboardActionButton` anlegen.
- [ ] Action-Katalog mit Label-Key, Icon, Farbrolle, Size, Status und ARIA-Verhalten anlegen.
- [ ] Wiederverwendbare Action-Komponenten fuer Save, Delete, Remove, Edit, Create, Import, Export, Copy, Cancel, Close, Reject, Approve, Restore, Hold, Overwrite und Skip anlegen.
- [ ] Generische i18n Keys in `DashboardMessages`, `de` und `en` ergaenzen.
- [ ] `DashboardField`, `DashboardInput`, `DashboardTextarea`, `DashboardSelect`, `DashboardCombobox` und `DashboardMultiSelect` anlegen.
- [ ] `DashboardNumberInput` und `DashboardStepper` anlegen.
- [ ] `DashboardCheckboxField` und `DashboardSwitchField` anlegen.
- [ ] `DashboardTabs` und `DashboardSegmentedControl` anlegen.
- [ ] `DashboardMenu`, `DashboardMenuItem`, `TableSortHeader`, `DashboardDragHandle` und `DisclosureButton` anlegen.
- [ ] `npm run typecheck -w @lmaa/dashboard` ausfuehren.

### Stufe 4: Bestehende Action-Buttons intern umstellen

- [ ] `TableActionButton` intern auf `DashboardButton` legen.
- [ ] `EditorToolbarButton` intern auf `DashboardButton` legen.
- [ ] `ImportButton` intern auf `DashboardActionButton`/File-Wrapper legen.
- [ ] `ExportButton` intern auf `DashboardActionButton` legen.
- [ ] `HeaderBackButton` als dokumentierte Navigationsausnahme auf zentrale Basis legen.
- [ ] Dialog-Footer-Buttons auf neue Button-Basis migrieren.
- [ ] rohe Action-Buttons in `ErrorBoundary` migrieren.
- [ ] Screenshot-Vergleich fuer Tabellen, Toolbars und Dialoge pruefen.

### Stufe 5: Control-Primitives migrieren

- [ ] `Dropdown.tsx` auf `DashboardCombobox`/`DashboardListbox` umbauen.
- [ ] `FilterDropdown.tsx` anbinden.
- [ ] sichtbare native Selects in `RejectDialog`, `NotificationsTab`, `UserProfileFields`, `UserCreateCard` und weiteren Fundstellen ersetzen.
- [ ] `MultiSelect`, `CountryCodeSelect` und `RegionSelect` auf gemeinsame Popover-/Listbox-Basis bringen.
- [ ] Inputs in High-Drift-Dateien auf `DashboardInput` migrieren.
- [ ] Textareas auf `DashboardTextarea` migrieren.
- [ ] Number-Inputs und Stepper auf `DashboardNumberInput`/`DashboardStepper` migrieren.
- [ ] `Tabs.tsx` und Dashboard-Tabs auf `DashboardTabs` migrieren.
- [ ] `SegmentedControl` und `SegmentSwitch` konsolidieren.
- [ ] `ContextMenu` und Dropdown-Items auf `DashboardMenu`/`DashboardMenuItem` migrieren.
- [ ] `TableSortHeader` extrahieren und in Tabellen verwenden.
- [ ] `DashboardDragHandle` einfuehren und DND-Fundstellen migrieren.
- [ ] Static Gates fuer rohe Selects, `h-9`, direkte Fokusklassen und direkte `--ds-btn-*` Klassen pruefen.

### Stufe 6: Feature-Slices migrieren

- [ ] Form Builder Slice migrieren.
- [ ] Submissions Slice migrieren.
- [ ] System Settings und Users Slice migrieren.
- [ ] Content Slice migrieren.
- [ ] Media Slice migrieren.
- [ ] Landing Page und Widgets Slice migrieren.
- [ ] Pro Slice Typecheck, Lint und relevanten Browser-Flow pruefen.

### Stufe 7: Cleanup

- [ ] Nicht mehr referenzierte i18n Keys entfernen.
- [ ] Legacy-Exports wie `dialogBtnPrimary`, `dialogBtnSecondary`, `dialogBtnDestructive`, `formBtnBaseClass` und alte Field-Klassen entfernen oder bewusst dokumentieren.
- [ ] Alias-Komponenten entfernen oder dokumentiert behalten.
- [ ] doppelte Popover-/Portal-/Outside-Click-Logik abbauen.
- [ ] Button- und Control-Inventare aktualisieren.
- [ ] Plan-Websites aktualisieren, falls Zielzustand sichtbar geaendert wurde.

### Stufe 8: Abschluss-QA

- [ ] `npm run typecheck -w @lmaa/ui`
- [ ] `npm run typecheck -w @lmaa/dashboard`
- [ ] `npm run lint -w @lmaa/ui`
- [ ] `npm run lint -w @lmaa/dashboard`
- [ ] `npm run build:dashboard`
- [ ] Tabellen mit Sort-Headern und Row-Actions pruefen.
- [ ] Dialog-Footer mit Primary/Neutral/Danger pruefen.
- [ ] Editor-Toolbar pruefen.
- [ ] Form Builder inklusive DND pruefen.
- [ ] Selects, MultiSelects und ContextMenu pruefen.
- [ ] Inputs, Textareas, Stepper und DateTimePicker pruefen.
- [ ] Tabs und Segments im Content pruefen.
- [ ] HeaderBackButton und Sidebar-Controls pruefen.
- [ ] Light/Dark Mode pruefen.
- [ ] schmale Viewports fuer dichte Controls pruefen.

## Stufe 0: Baseline und Schutzrails

Zweck: Vor der ersten Code-Migration muss klar sein, was heute kaputt, rot oder absichtlich anders ist. Sonst werden spaetere Regressionen nicht sauber von Altlasten getrennt.

Arbeit:

- Aktuelle UI-Inventare aktualisieren oder bestaetigen:
  - Button-Inventar
  - Control-/Component-Inventar
  - i18n-Key-Duplikate
  - direkte Hoehenklassen
  - direkte Fokus-/Farbklassen
- Aktuelle Gates laufen lassen:
  - `npm run typecheck -w @lmaa/ui`
  - `npm run typecheck -w @lmaa/dashboard`
  - `npm run lint -w @lmaa/ui`
  - `npm run lint -w @lmaa/dashboard`
  - `npm run build:dashboard`
- Screenshots fuer die wichtigsten UI-Flaechen erzeugen:
  - Tabellen mit Actions und Sort-Headern
  - Dialog-Footer
  - Editor-Toolbar
  - Form Builder inklusive Drag-and-Drop
  - Dropdowns, Selects und Menues
  - Light/Dark Mode

Baseline-Ergebnis 2026-05-10:

- Gate-Status:
  - `npm run typecheck -w @lmaa/ui`: gruen.
  - `npm run typecheck -w @lmaa/dashboard`: gruen.
  - `npm run lint -w @lmaa/ui`: gruen.
  - `npm run lint -w @lmaa/dashboard`: gruen.
  - `npm run test -w @lmaa/dashboard`: gruen, 1 Testdatei, 2 Tests.
  - `npm run build:dashboard`: gruen.
  - `@lmaa/ui` hat keinen eigenen `test`-Script.
- Statische Inventar-Baseline:
  - Dashboard-`<button>`-Tags: 199 via `rg --count-matches "<button" apps/dashboard/src --glob "*.tsx"`.
  - Rohe Inputs in Dashboard und `@lmaa/ui`: 107 via `rg --count-matches "<input" apps/dashboard/src packages/ui/src --glob "*.tsx"`.
  - Rohe Selects in Dashboard und `@lmaa/ui`: 17 via `rg --count-matches "<select" apps/dashboard/src packages/ui/src --glob "*.tsx"`.
  - Rohe Textareas in Dashboard und `@lmaa/ui`: 10 via `rg --count-matches "<textarea" apps/dashboard/src packages/ui/src --glob "*.tsx"`.
  - Direkte `h-9`-Klassen in Dashboard und `@lmaa/ui`: 79 via `rg --count-matches "\\bh-9\\b" apps/dashboard/src packages/ui/src --glob "*.tsx"`.
  - Direkte Fokusklassen `focus:ring-*`/`focus:border-*`: 99 via `rg --count-matches "focus:(ring|border)-" apps/dashboard/src packages/ui/src --glob "*.tsx"`.
  - `--ds-btn-*`-Referenzen im UI-Scope: 324 via `rg --count-matches --glob "*.tsx" --glob "*.ts" --glob "*.css" -- "--ds-btn-" apps/dashboard/src packages/ui/src packages/shared/styles/tokens.css`.
  - `docs/ui-consolidation/dashboard-buttons.md` bleibt als Action-Button-Inventar gueltig: 194 Action-Button-Usages, gruppiert in 155 Tabellenzeilen.
- Screenshot-Baseline:
  - `docs/ui-consolidation/screenshots/baseline-2026-05-10/shops-table-light.png`: Shop-Tabelle mit Sort-Headern, Filter-Toolbar und Row-Actions im Light Mode.
  - `docs/ui-consolidation/screenshots/baseline-2026-05-10/reports-dropdown-dark.png`: Meldungen-Tabelle mit geoeffnetem Filter-Dropdown im Dark Mode.
  - `docs/ui-consolidation/screenshots/baseline-2026-05-10/forms-new-dialog-light.png`: Form-Builder-Neu-Dialog inklusive Dialog-Footer im Light Mode.
  - `docs/ui-consolidation/screenshots/baseline-2026-05-10/form-builder-config-light.png`: Form-Builder mit Header-Toolbar, Canvas, Drag-Handle und geoeffnetem Field-Config-Panel im Light Mode.
  - Screenshots wurden ueber lokalen Dashboard-Preview mit Mock-API und Headless Chrome/CDP erzeugt; Runtime-Exceptions: 0.

Stopp-Kriterium:

- Wenn ein Gate bereits rot ist, wird die Ursache dokumentiert. Die Konsolidierung startet erst, wenn klar ist, ob der Fehler behoben oder als Baseline-Risiko akzeptiert wird.

## Stufe 1: Tokens und Foundation

Zweck: Die UI kann nicht konsolidiert werden, solange Hoehen, Fokus, Farben und Hover-Zustaende aus lokalen Strings kommen.

Betroffene Dateien:

- `packages/shared/styles/tokens.css`
- `packages/ui/src/FormPrimitives.tsx`
- `packages/ui/src/Dialog.tsx`
- globale Dashboard-Styles, falls sie Button-/Menu-Items quer beeinflussen

Arbeit:

- Control-Size-Tokens ergaenzen:
  - `--ds-control-h-action`
  - `--ds-control-h-icon`
  - `--ds-control-h-field`
  - `--ds-control-h-field-large`
  - `--ds-control-h-menu-item`
- Focus-/Interaction-Tokens ergaenzen:
  - `--ds-focus-ring`
  - `--ds-focus-ring-offset`
  - `--ds-control-hover-bg`
  - `--ds-control-active-bg`
  - `--ds-control-disabled-opacity`
- Overlay-/Popover-Tokens ergaenzen:
  - `--ds-overlay-z-dropdown`
  - `--ds-overlay-z-menu`
  - `--ds-overlay-z-dialog`
  - `--ds-overlay-shadow`
- Fehlende oder driftende Tokens klaeren:
  - `--ds-border-focus`
  - `--ds-bg-hover`
  - `--ds-nav-hover-bg`
  - `--ds-surface-hover`
- `formInputClass` auf `h-8` Default vorbereiten, aber Textareas aus der fixen Hoehe herausloesen.
- Dialog-Button-Klassen nicht sofort entfernen, aber als Legacy markieren.

Umgesetzt 2026-05-10:

- `packages/shared/styles/tokens.css` definiert zentrale Control-Hoehen fuer Actions, Icon-Actions, Felder, Large-Felder und Menu-Items.
- Fokus, Hover, Active, Disabled, Border-Focus, Surface-Hover, Background-Hover und Nav-Hover haben gemeinsame Foundation-Tokens. Dashboard-lokale Nav-Overrides bleiben fuer die App-spezifische aktive Sidebar-Optik erhalten.
- Overlay-/Popover-Z-Index- und Shadow-Tokens sind zentral verfuegbar.
- `formInputClass` nutzt `--ds-control-h-field` als `h-8`-Basis. Ein temporaerer Textarea-Guard hebt die fixe Hoehe fuer Legacy-Textarea-Consumer auf; `formTextareaClass` ist als eigener Export vorbereitet.
- `dialogBtnPrimary`, `dialogBtnSecondary` und `dialogBtnDestructive` bleiben exportiert, sind aber als Legacy fuer die Stufe-4-Migration markiert.

Verifiziert:

- `npm run typecheck -w @lmaa/ui`
- `npm run lint -w @lmaa/ui`
- `npm run typecheck -w @lmaa/dashboard`
- `npm run lint -w @lmaa/dashboard`
- `npm run build:dashboard`
- `npx -y react-doctor@latest packages/ui --verbose --diff`
- Dashboard-Browser-Smoke gegen `apps/dashboard/dist` mit Mock-API: `/shops` rendert Tabellen-/Sidebar-Controls ohne ErrorBoundary und ohne sichtbare Token-Ausfaelle.

Gate:

- Keine Feature-Datei wird in dieser Stufe migriert.
- `@lmaa/ui` und Dashboard muessen die neuen Tokens ohne visuelle Totalausfaelle laden.

## Stufe 2: Shared Primitives in `@lmaa/ui`

Zweck: `packages/ui` stellt die framework-nahen Bausteine bereit. Dort gehoeren keine Dashboard-i18n-Keys und keine fachlichen Button-Actions hinein.

Neue oder angepasste Primitives:

- `ButtonPrimitive`
- `IconButtonPrimitive`
- `FieldShell`
- `InputPrimitive`
- `TextareaPrimitive`
- `ControlTrigger`
- `ListboxPopover`
- `ListboxOption`
- `MenuPrimitive`
- `MenuItemPrimitive`
- `TabsPrimitive`
- `SegmentedControlPrimitive`
- `SwitchPrimitive`
- `CheckboxPrimitive`
- `DialogFooterPrimitive`
- `SurfacePrimitive`

Bestehende Dateien, die zuerst intern umgebaut werden:

- `packages/ui/src/FormPrimitives.tsx`
- `packages/ui/src/Tabs.tsx`
- `packages/ui/src/ToggleSwitch.tsx`
- `packages/ui/src/MultiSelect.tsx`
- `packages/ui/src/CountryCodeSelect.tsx`
- `packages/ui/src/RegionSelect.tsx`
- `packages/ui/src/Dialog.tsx`

Wichtige Entscheidungen:

- `TabsPrimitive` bekommt roving tabindex, Arrow-Key-Verhalten, `aria-controls` und `aria-labelledby`.
- `ListboxPopover` bekommt stabile IDs, Portal-Faehigkeit, Escape-/Outside-Click-Handling und keyboardfähige Optionen.
- `MenuItemPrimitive` bekommt `h-8` Default und `compact` als expliziten `h-7` Modus.
- `InputPrimitive` und `TextareaPrimitive` teilen Tokens, aber nicht dieselbe fixe Hoehe.

Teilfortschritt 2026-05-10:

- `packages/ui/src/ButtonPrimitive.tsx` stellt `ButtonPrimitive` und `IconButtonPrimitive` bereit.
- Button-Primitives nutzen die Foundation-Tokens fuer Action-/Control-/Large-Hoehen, Fokus, Disabled-State und bestehende `--ds-btn-*` Farbrollen.
- `IconButtonPrimitive` erzwingt per Typ eine zugängliche Benennung ueber `aria-label` oder `aria-labelledby`.
- `packages/ui/src/classNames.ts` buendelt den kleinen `cx`-Helper fuer neue Primitives; `FormPrimitives.tsx` nutzt ihn bereits.

Verifiziert fuer den Button-Primitive-Task:

- `npm run typecheck -w @lmaa/ui`
- `npm run lint -w @lmaa/ui`

Gate:

- `npm run typecheck -w @lmaa/ui`
- `npm run lint -w @lmaa/ui`
- Keine Dashboard-Feature-Migration in derselben Scheibe.

## Stufe 3: Dashboard Wrapper und Action-Katalog

Zweck: Dashboard-spezifische Semantik, i18n und Phosphor-Icons werden im Dashboard-Layer gebuendelt. Feature-Dateien sollen nur noch Aktion, Variante und Daten uebergeben.

Neue oder angepasste Dashboard-Komponenten:

- `DashboardButton`
- `DashboardIconButton`
- `DashboardActionButton`
- `SaveActionButton`
- `DeleteActionButton`
- `RemoveActionButton`
- `EditActionButton`
- `CreateActionButton`
- `ImportActionButton`
- `ExportActionButton`
- `CopyActionButton`
- `CancelActionButton`
- `CloseActionButton`
- `RejectActionButton`
- `ApproveActionButton`
- `RestoreActionButton`
- `HoldActionButton`
- `OverwriteActionButton`
- `SkipActionButton`

Control-Wrapper:

- `DashboardField`
- `DashboardInput`
- `DashboardTextarea`
- `DashboardSelect`
- `DashboardCombobox`
- `DashboardMultiSelect`
- `DashboardNumberInput`
- `DashboardStepper`
- `DashboardCheckboxField`
- `DashboardSwitchField`
- `DashboardTabs`
- `DashboardSegmentedControl`
- `DashboardMenu`
- `DashboardMenuItem`
- `TableSortHeader`
- `DashboardDragHandle`
- `DisclosureButton`

Betroffene Dateien:

- `apps/dashboard/src/components/ui/*`
- `apps/dashboard/src/i18n/messages.ts`

Arbeit:

- Action-Katalog anlegen:
  - Action-ID
  - Label-Key
  - Default-Icon
  - Farbrolle
  - Size
  - Status-Labels
  - ARIA-Verhalten
  - erlaubte Ausnahme
- Neue generische Keys in `DashboardMessages`, `de` und `en` anlegen:
  - `common.import`
  - `common.export`
  - `common.create`
  - `common.approve`
  - `common.restore`
  - `common.putOnHold`
  - `common.overwrite`
  - `common.skip`
  - weitere Keys nur nach Fundstellenabgleich
- Fachlich unterschiedliche Texte nicht blind mergen:
  - `Löschen` und `Entfernen`
  - `Kopieren` und `Duplizieren`
  - `Freischalten` und `Akzeptieren`
  - fachliches `Template importieren` gegen generisches `Importieren`

Gate:

- `npm run typecheck -w @lmaa/dashboard`
- keine toten i18n Keys in dieser Stufe entfernen
- keine Feature-Massenmigration ohne vorhandene Wrapper

## Stufe 4: Bestehende Action-Buttons intern umstellen

Zweck: Die sichtbar groessten Action-Redundanzen werden zuerst ueber bestehende Komponenten abgefangen, bevor Feature-Dateien breit angefasst werden.

Reihenfolge:

1. `apps/dashboard/src/components/ui/TableActionButton.tsx`
2. `apps/dashboard/src/components/ui/EditorToolbarButton.tsx`
3. `apps/dashboard/src/components/ui/ImportButton.tsx`
4. `apps/dashboard/src/components/ui/ExportButton.tsx`
5. `apps/dashboard/src/components/ui/HeaderBackButton.tsx`
6. `packages/ui/src/Dialog.tsx` und Dashboard-Dialog-Footer
7. rohe Buttons in `apps/dashboard/src/components/app/ErrorBoundary.tsx`

Arbeit:

- Intern auf `DashboardButton`/`DashboardIconButton` legen.
- Default auf `h-7` bzw. `size-7` setzen.
- Status-Zustaende wie `saving`, `saved`, `deleting` als Prop modellieren.
- Variantenfarben aus dem Action-Katalog ziehen.
- Jeder Action-Button bekommt ein Icon.
- Header-/Navigationsactions bleiben dedizierte Wrapper, aber ohne freie Auto-Hoehen.

Gate:

- Tabellen-Actions rendern ohne Layout-Shift.
- Editor-Toolbar bleibt scanbar.
- Dialog-Footer hat keine `h-9`-Legacy-Buttons mehr, ausser explizit `large`.
- Import-/Export-Flows funktionieren inklusive Hidden File Input.

## Stufe 5: Control-Primitives migrieren

Zweck: Nicht-Action-Controls werden parallel zur Button-Linie konsolidiert, aber nicht mit ihr vermischt.

### 5A: Selects, Comboboxen und Dropdowns

Betroffene Dateien:

- `apps/dashboard/src/components/ui/Dropdown.tsx`
- `apps/dashboard/src/components/ui/FilterDropdown.tsx`
- `apps/dashboard/src/components/ui/RejectDialog.tsx`
- `apps/dashboard/src/features/system/settings/NotificationsTab.tsx`
- `apps/dashboard/src/features/system/users/UserProfileFields.tsx`
- `apps/dashboard/src/features/system/users/UserCreateCard.tsx`
- `packages/ui/src/MultiSelect.tsx`
- `packages/ui/src/CountryCodeSelect.tsx`
- `packages/ui/src/RegionSelect.tsx`

Arbeit:

- Sichtbare native `<select>` durch `DashboardSelect`/`DashboardCombobox` ersetzen.
- Trigger `h-8`, Optionen `h-8`, kompakte Header-Trigger nur per `size="compact"`.
- Custom-Caret, Listbox-Rollen, Highlight, Auswahl, Escape, Outside Click und Portal zentralisieren.
- Suchfelder in Dropdowns auf `DashboardInput` legen.

Gate:

- Statisches Gate: keine neuen sichtbaren rohen `<select>`.
- Dropdowns sind im Light- und Dark-Mode lesbar.
- Keyboard-Navigation funktioniert.

### 5B: Inputs, Textareas, Number und Stepper

Betroffene Dateien:

- `packages/ui/src/FormPrimitives.tsx`
- `packages/ui/src/ShopEditForm.tsx`
- `apps/dashboard/src/features/templates/form-builder/FieldConfigPanel.tsx`
- `apps/dashboard/src/features/templates/form-builder/SubmissionConfigPanel.tsx`
- `apps/dashboard/src/features/content/shops/ReminderForm.tsx`
- `apps/dashboard/src/features/system/WidgetEditorPanel.tsx`
- `apps/dashboard/src/features/content/landing-page/HeroBannerTab.tsx`

Arbeit:

- Inputs auf `DashboardInput` mit `h-8`.
- Textareas auf `DashboardTextarea` ohne fixe `h-8`.
- Number-Controls auf `DashboardNumberInput` oder `DashboardStepper`.
- Stepper-Buttons symmetrisch paddden und Icon exakt zentrieren.

Gate:

- Eingaben bleiben klick- und tastaturbedienbar.
- Keine lokalen `inputClass`/`selectClass`/`formBtnBaseClass` in migrierten Dateien.

### 5C: Tabs und Segments

Betroffene Dateien:

- `packages/ui/src/Tabs.tsx`
- `apps/dashboard/src/components/ui/SegmentedControl.tsx`
- `apps/dashboard/src/components/ui/SegmentSwitch.tsx`

Arbeit:

- Content-Tabs bekommen `h-8`, sichtbar kraeftiger als Toolbar-Segments.
- Kompakte Segments bleiben `h-7`, aber als expliziter Modus.
- `SegmentSwitch` wird entfernt oder als Alias auf `DashboardSegmentedControl` gelegt.

Gate:

- Roving tabindex und Arrow-Key-Verhalten fuer Tabs.
- Keine Content-Tabs, die optisch wie winzige Toolbar-Chips wirken.

### 5D: Menues, Dropdown-Items und ContextMenu

Betroffene Dateien:

- `apps/dashboard/src/components/ui/ContextMenu.tsx`
- alle Menues, die lokale `py-1.5`/`px-3` Items setzen

Arbeit:

- `DashboardMenu` und `DashboardMenuItem` einfuehren.
- Default Item `h-8`, compact `h-7`.
- Danger-/Disabled-/Selected-Zustaende ueber Tokens.
- Globale Button-CSS-Falle, die `--ds-btn-*` in Menueitems beeinflusst, entfernen.

Gate:

- ContextMenu bleibt portalfaehig.
- Danger-Item-Farbe wird nicht von Button-Styles ueberschrieben.

### 5E: Table-Sort-Header

Betroffene Dateien:

- `apps/dashboard/src/components/ui/Table.tsx`
- Tabellen-Features mit eigener Sort-Logik

Arbeit:

- `TableSortHeader` extrahieren.
- `aria-sort`, lokalisierte Sort-Ansage und Icon-Zustaende zentralisieren.
- Header-Button `h-7`, nicht-sortierbare Header bleiben Text.
- Locale nicht hart auf `de` im Sort-Verhalten verdrahten.

Gate:

- Sortierung bleibt funktional.
- Sticky Header bleiben stabil.

### 5F: Drag-Handles und DND

Betroffene Dateien:

- `apps/dashboard/src/components/layout/Sidebar.tsx`
- `apps/dashboard/src/features/templates/form-builder/SubmissionConfigPanel.tsx`
- Form-Builder DND-Komponenten

Arbeit:

- `DashboardDragHandle` einfuehren.
- Icon horizontal und vertikal exakt zentrieren.
- `size-7` Default.
- KeyboardSensor und i18n-faehige ARIA-Labels zentralisieren.
- Drag-Overlay bleibt objektabhaengig und wird nicht auf Handle-Hoehe gezwungen.

Gate:

- Pointer-DND und Keyboard-DND funktionieren.
- Handle ist fokussierbar, wo es eine eigenstaendige Bedienflaeche ist.

## Stufe 6: Feature-Slices migrieren

Zweck: Die eigentlichen Features werden in fachlichen Scheiben migriert, damit Review und Regression beherrschbar bleiben.

Empfohlene Reihenfolge:

1. Form Builder
   - `FieldConfigPanel`
   - `SubmissionConfigPanel`
   - `FormBuilderListPage`
   - `FormBuilderEditPage`
2. Submissions
   - `SubmissionsPage`
   - `SubmissionDialogs`
   - `RejectDialog`
3. System Settings und Users
   - `NotificationsTab`
   - `DomainAlertsTab`
   - `UsersPage`
   - `UserCreateCard`
   - `UserEditCard`
   - `UserProfileFields`
4. Content
   - `ReminderForm`
   - Shops-Tabellen und Content-Editoren
5. Media
   - `MediaPage`
   - `MediaDetailSidebar`
   - `MediaTable`
6. Landing Page und Widgets
   - `HeroBannerTab`
   - `WidgetEditorPanel`
   - `NavManagerPage`

Arbeitsregel pro Slice:

- Erst Komponentenverwendung migrieren.
- Dann lokale Klassen entfernen.
- Danach i18n-Key-Reduktion nur fuer diesen Slice.
- Dann Gates und Screenshot-Check.
- Erst danach naechster Slice.

Gate pro Slice:

- Typecheck Dashboard.
- Lint Dashboard oder mindestens betroffene Dateien.
- Relevanter Browser-Flow oeffnet ohne Console-Errors.
- Light/Dark Mode fuer betroffene Flaeche geprueft.

## Stufe 7: Cleanup

Zweck: Nach der Migration duerfen keine alten parallelen APIs uebrig bleiben, sonst entsteht erneut Drift.

Arbeit:

- Nicht mehr referenzierte i18n Keys entfernen.
- Legacy-Exports entfernen:
  - `dialogBtnPrimary`
  - `dialogBtnSecondary`
  - `dialogBtnDestructive`
  - alte `formBtnBaseClass`
  - alte `formInputClass`, falls vollstaendig ersetzt
- Alias-Komponenten entfernen oder bewusst dokumentiert lassen.
- Doppelte Popover-/Portal-/Outside-Click-Logik entfernen.
- UI-Inventare aktualisieren:
  - `dashboard-buttons.md`
  - `dashboard-buttons.html`
  - Plan-Websites, falls Zielzustand sichtbar angepasst werden muss.

Static Gates:

- keine neuen sichtbaren rohen `<select>`
- keine direkten `h-9` Standard-Felder ohne `size="large"`
- keine direkten `focus:ring-*`/`focus:border-*` in Feature-Controls
- keine direkten `--ds-btn-*` Klassen in Menueitems oder Feature-Controls
- keine rohen Action-Buttons mit wiederverwendbarer Standardaction

## Stufe 8: Abschluss-QA

Zweck: Die Konsolidierung ist erst fertig, wenn sie im Dashboard sichtbar stabil ist und nicht nur TypeScript kompiliert.

Pflicht-Gates:

- `npm run typecheck -w @lmaa/ui`
- `npm run typecheck -w @lmaa/dashboard`
- `npm run lint -w @lmaa/ui`
- `npm run lint -w @lmaa/dashboard`
- `npm run build:dashboard`

UI-Pruefung:

- Tabellen mit Sort-Headern und Row-Actions
- Dialog-Footer mit Primary/Neutral/Danger
- Editor-Toolbar
- Form Builder inklusive DND
- Selects, MultiSelects und ContextMenu
- Inputs, Textareas, Stepper und DateTimePicker
- Tabs und Segments im Content
- HeaderBackButton und Sidebar-Controls
- Light/Dark Mode
- Mobile oder schmale Viewports fuer dichte Controls

Abschlussbedingungen:

- Button-Plan und UI-Plan beschreiben den aktuellen Zielzustand.
- Das Inventar zeigt keine unerwarteten alten Hoehen- oder Farbrollen.
- Alle sichtbaren Controls haben eine zentrale Komponente oder eine dokumentierte Ausnahme.

## Stop-Kriterien

Die Umsetzung wird unterbrochen, wenn eine dieser Bedingungen eintritt:

- Ein Primitive-Change verursacht unklare visuelle Regressionen in mehreren Feature-Bereichen.
- Ein geplanter generischer i18n-Key verliert Fachsemantik.
- Ein nativer Select kann nicht ohne Accessibility- oder Keyboard-Verlust ersetzt werden.
- Drag-and-Drop verliert Pointer- oder Keyboard-Bedienbarkeit.
- Ein Gate wird rot und die Ursache ist nicht lokal zur aktuellen Migrationsscheibe.

## Review-Schnitt

Jede Stufe sollte als eigener Review-Schnitt behandelbar sein. Innerhalb von Stufe 5 und 6 werden die Unterschritte als eigene Scheiben behandelt. Ein Review ist erst sinnvoll, wenn die jeweilige Scheibe ihre Gates bestanden hat und die zugehörige Plan-Dokumentation nicht mehr dem Code widerspricht.
