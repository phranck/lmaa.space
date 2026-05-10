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
- [x] `FieldShell`, `InputPrimitive` und `TextareaPrimitive` anlegen.
- [x] `ControlTrigger`, `ListboxPopover` und `ListboxOption` anlegen.
- [x] `MenuPrimitive` und `MenuItemPrimitive` anlegen.
- [x] `TabsPrimitive` mit roving tabindex und Arrow-Key-Verhalten anlegen.
- [x] `SegmentedControlPrimitive` anlegen.
- [x] `SwitchPrimitive` und `CheckboxPrimitive` anlegen.
- [x] `DialogFooterPrimitive` und `SurfacePrimitive` anlegen.
- [x] `packages/ui/src/FormPrimitives.tsx` auf Foundation umbauen.
- [x] `packages/ui/src/Tabs.tsx` auf `TabsPrimitive` umbauen.
- [x] `packages/ui/src/ToggleSwitch.tsx` auf `SwitchPrimitive` umbauen.
- [x] `packages/ui/src/MultiSelect.tsx`, `CountryCodeSelect.tsx` und `RegionSelect.tsx` auf Listbox-/Popover-Foundation vorbereiten.
- [x] `npm run typecheck -w @lmaa/ui` ausfuehren.
- [x] `npm run lint -w @lmaa/ui` ausfuehren.

### Stufe 3: Dashboard Wrapper und Action-Katalog

- [x] `DashboardButton` anlegen.
- [x] `DashboardIconButton` anlegen.
- [x] `DashboardActionButton` anlegen.
- [x] Action-Katalog mit Label-Key, Icon, Farbrolle, Size, Status und ARIA-Verhalten anlegen.
- [x] Wiederverwendbare Action-Komponenten fuer Save, Delete, Remove, Edit, Create, Import, Export, Copy, Cancel, Close, Reject, Approve, Restore, Hold, Overwrite und Skip anlegen.
- [x] Generische i18n Keys in `DashboardMessages`, `de` und `en` ergaenzen.
- [x] `DashboardField`, `DashboardInput`, `DashboardTextarea`, `DashboardSelect`, `DashboardCombobox` und `DashboardMultiSelect` anlegen.
- [x] `DashboardNumberInput` und `DashboardStepper` anlegen.
- [x] `DashboardCheckboxField` und `DashboardSwitchField` anlegen.
- [x] `DashboardTabs` und `DashboardSegmentedControl` anlegen.
- [x] `DashboardMenu`, `DashboardMenuItem`, `TableSortHeader`, `DashboardDragHandle` und `DisclosureButton` anlegen.
- [x] `npm run typecheck -w @lmaa/dashboard` ausfuehren.

### Stufe 4: Bestehende Action-Buttons intern umstellen

- [x] `TableActionButton` intern auf `DashboardButton` legen.
- [x] `EditorToolbarButton` intern auf `DashboardButton` legen.
- [x] `ImportButton` intern auf `DashboardActionButton`/File-Wrapper legen.
- [x] `ExportButton` intern auf `DashboardActionButton` legen.
- [x] `HeaderBackButton` als dokumentierte Navigationsausnahme auf zentrale Basis legen.
- [x] Dialog-Footer-Buttons auf neue Button-Basis migrieren.
- [x] rohe Action-Buttons in `ErrorBoundary` migrieren.
- [x] Screenshot-Vergleich fuer Tabellen, Toolbars und Dialoge pruefen.

### Stufe 5: Control-Primitives migrieren

- [x] `Dropdown.tsx` auf `DashboardCombobox`/`DashboardListbox` umbauen.
- [x] `FilterDropdown.tsx` anbinden.
- [x] sichtbare native Selects in `RejectDialog`, `NotificationsTab`, `UserProfileFields`, `UserCreateCard` und weiteren Fundstellen ersetzen.
- [x] `MultiSelect`, `CountryCodeSelect` und `RegionSelect` auf gemeinsame Popover-/Listbox-Basis bringen.
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

Teilfortschritt 2026-05-10, Field-Primitives:

- `packages/ui/src/FieldPrimitives.tsx` stellt `FieldShell`, `InputPrimitive` und `TextareaPrimitive` bereit.
- `FieldShell` kann Controls ueber Render-Props mit stabiler `id`, `aria-describedby`, `aria-invalid` und `aria-required` versorgen.
- `InputPrimitive` und `TextareaPrimitive` teilen Foundation-Tokens fuer Border, Fokus, Disabled-State und Farben, behalten aber getrennte Hoehen-/Min-Height-Regeln.
- `packages/ui/src/index.ts` exportiert die neuen Komponenten und Props.

Verifiziert fuer den Field-Primitive-Task:

- `npm run typecheck -w @lmaa/ui`
- `npm run lint -w @lmaa/ui`

Teilfortschritt 2026-05-10, Listbox-Primitives:

- `packages/ui/src/ListboxPrimitives.tsx` stellt `ControlTrigger`, `ListboxPopover` und `ListboxOption` bereit.
- `ControlTrigger` buendelt Trigger-Hoehen, Fokus, Disabled-State, Invalid-State und ARIA-Anbindung fuer Listbox-/Combobox-Trigger.
- `ListboxPopover` stellt stabile Listbox-/Option-IDs, optionale Portal-Positionierung, Escape-/Outside-Click-Handling und Arrow-/Home-/End-/Enter-/Space-Navigation bereit.
- `ListboxOption` setzt `role="option"`, `aria-selected`, Active-/Selected-State und gemeinsame Option-Hoehen auf Foundation-Tokens.
- `packages/ui/src/index.ts` exportiert die neuen Komponenten und Props.

Verifiziert fuer den Listbox-Primitive-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, Menu-Primitives:

- `packages/ui/src/MenuPrimitives.tsx` stellt `MenuPrimitive` und `MenuItemPrimitive` bereit.
- `MenuPrimitive` unterstuetzt Portal-Rendering, Contextmenu-Origin oder Trigger-Positionierung, Viewport-Clamping, Escape-/Outside-Click-Handling und Arrow-/Home-/End-Tastaturfokus.
- `MenuItemPrimitive` nutzt `h-[var(--ds-control-h-menu-item)]` als Default-Hoehe und `compact` als expliziten `h-7` Modus.
- `MenuItemPrimitive` stellt Leading-/Trailing-Slots, `danger`-Variante, Disabled-State und optionales Auto-Close nach Auswahl bereit.
- `packages/ui/src/index.ts` exportiert die neuen Komponenten und Props.

Verifiziert fuer den Menu-Primitive-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, Tabs-Primitives:

- `packages/ui/src/TabsPrimitives.tsx` stellt `TabsPrimitive`, `TabListPrimitive`, `TabTriggerPrimitive` und `TabPanelPrimitive` bereit.
- `TabListPrimitive` implementiert roving Tastaturverhalten fuer Arrow-Keys, Home und End mit horizontaler oder vertikaler Orientierung.
- `TabTriggerPrimitive` setzt `role="tab"`, `aria-selected`, `aria-controls`, stabile Trigger-/Panel-IDs und `tabIndex` fuer den selektierten Tab.
- `TabPanelPrimitive` setzt `role="tabpanel"`, `aria-labelledby`, stabile Panel-IDs und optionales `forceMount`.
- `packages/ui/src/index.ts` exportiert die neuen Komponenten und Props.

Verifiziert fuer den Tabs-Primitive-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, Segmented-Control-Primitive:

- `packages/ui/src/SegmentedControlPrimitive.tsx` stellt eine generische, optionbasierte `SegmentedControlPrimitive` bereit.
- Die Primitive deckt Icon-only-, Label-, Badge- und Disabled-Optionen ab und unterstuetzt `compact`, `default` und `large`.
- Die Primitive misst den aktiven Sliding-Pill-Indikator ueber ResizeObserver und aktualisiert ihn bei Layout- und Viewport-Aenderungen.
- Arrow-Keys, Home und End fokussieren und aktivieren benachbarte Segmente; der aktive Button bleibt der einzige Tab-Stop.
- `packages/ui/src/index.ts` exportiert die neue Komponente und Props.

Verifiziert fuer den Segmented-Control-Primitive-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, Choice-Primitives:

- `packages/ui/src/ChoicePrimitives.tsx` stellt `SwitchPrimitive` und `CheckboxPrimitive` bereit.
- `SwitchPrimitive` setzt `role="switch"`, `aria-checked`, gemeinsame Fokus-/Disabled-Tokens und `sm`/`md` Track-/Thumb-Groessen.
- `CheckboxPrimitive` nutzt einen echten Checkbox-Input, visuelle Box, optionale Label-/Description-Slots und `indeterminate`-Darstellung.
- Beide Primitives verwenden `onCheckedChange`, damit bestehende Wrapper ihr bisheriges API kontrolliert darauf abbilden koennen.
- `packages/ui/src/index.ts` exportiert die neuen Komponenten und Props.

Verifiziert fuer den Choice-Primitive-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, Surface-Primitives:

- `packages/ui/src/SurfacePrimitives.tsx` stellt `SurfacePrimitive` und `DialogFooterPrimitive` bereit.
- `SurfacePrimitive` buendelt wiederkehrende Panel-, Section-, Inset- und Elevated-Surface-Klassen mit kontrollierten Padding-/Radius-Optionen.
- `DialogFooterPrimitive` buendelt Dialog-Footer-Border, Inset-Hintergrund, Dichte und Start-/End-/Between-Ausrichtung.
- Die Primitives sind bewusst layoutnah und enthalten keine Dashboard-i18n-Keys oder fachlichen Actions.
- `packages/ui/src/index.ts` exportiert die neuen Komponenten und Props.

Verifiziert fuer den Surface-Primitive-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, FormPrimitives-Foundation:

- `packages/ui/src/FieldPrimitives.tsx` exportiert die Foundation-Klassen fuer Shell, Label, Help, Error, Control-Basis und Control-Groessen intern nutzbar.
- `packages/ui/src/FormPrimitives.tsx` leitet `formLabelClass`, `formOptionalClass`, `formInputClass`, `formTextareaClass`, `formHelpClass` und `formErrorClass` aus dieser Foundation ab.
- Die bestehenden Legacy-Exports bleiben stabil, damit Dashboard-Callsites in spaeteren Stufen kontrolliert migriert werden koennen.

Verifiziert fuer den FormPrimitives-Foundation-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, Tabs-Wrapper:

- `packages/ui/src/Tabs.tsx` ist intern auf `TabsPrimitive`, `TabListPrimitive`, `TabTriggerPrimitive` und `TabPanelPrimitive` umgestellt.
- Die bestehenden Public Exports `Tabs`, `TabList`, `TabTrigger` und `TabContent` bleiben erhalten.
- Bestehende Optik bleibt ueber die bisherigen Klassen erhalten, bekommt aber stabile ARIA-IDs und Arrow-/Home-/End-Tastaturverhalten aus der Primitive.

Verifiziert fuer den Tabs-Wrapper-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, ToggleSwitch-Wrapper:

- `packages/ui/src/ToggleSwitch.tsx` delegiert intern an `SwitchPrimitive`.
- Das bestehende Public API mit `checked`, `onChange` und `disabled` bleibt erhalten.
- Fokus-, Disabled- und Track-/Thumb-Klassen kommen jetzt aus der Choice-Foundation.

Verifiziert fuer den ToggleSwitch-Wrapper-Task:

- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

Teilfortschritt 2026-05-10, Listbox-Foundation-Selects:

- `ControlTrigger` unterstuetzt einen `contentClassName`-Slot und kann per Ref als Trigger fuer Popover-Positionierung dienen.
- `ListboxPopover` unterstuetzt `closeOnSelect={false}`, damit Multi-Selects per Tastatur toggeln koennen, ohne das Popover zu schliessen.
- `CountryCodeSelect.tsx` nutzt `ControlTrigger`, `ListboxPopover` und `ListboxOption` fuer Portal, Outside-Click, Escape und Option-Keyboard-Verhalten.
- `RegionSelect.tsx` nutzt dieselbe Popover-/Option-Foundation und bleibt als Multi-Select nach Auswahl offen.
- `MultiSelect.tsx` nutzt `ControlTrigger`, `ListboxPopover` und `ListboxOption`; Suche und Clear-Badges bleiben API-kompatibel.

Verifiziert fuer den Listbox-Foundation-Selects-Task:

- `npm run lint -w @lmaa/ui`
- `npm run typecheck -w @lmaa/ui`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest packages/ui --verbose --diff`

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

Teilfortschritt 2026-05-10, Dashboard-Action-Foundation:

- `DashboardButton` und `DashboardIconButton` kapseln die Shared-Button-Primitives fuer den Dashboard-Layer inklusive `review`-Variante.
- `DashboardActionButton` nutzt einen Action-Katalog mit Label-Key, Icon, Farbrolle, Size, Busy-Status und ARIA-Verhalten.
- Spezifische Action-Komponenten fuer Save, Delete, Remove, Edit, Create, Import, Export, Copy, Cancel, Close, Reject, Approve, Restore, Hold, Overwrite und Skip sind verfuegbar.
- `DashboardMessages.common` enthaelt die generischen Action-Keys fuer `de` und `en`.

Verifiziert fuer den Dashboard-Action-Foundation-Task:

- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`

Teilfortschritt 2026-05-10, Dashboard-Control-Foundation:

- `DashboardControls.tsx` buendelt Dashboard-Wrapper fuer Field/Input/Textarea/Select/Combobox/MultiSelect.
- NumberInput, Stepper, CheckboxField und SwitchField sind als app-spezifische Control-Schicht verfuegbar.
- Tabs, SegmentedControl, Menu/MenuItem, TableSortHeader, DashboardDragHandle und DisclosureButton sind als zentrale Dashboard-Wrapper angelegt.
- Bestehende Feature-Dateien wurden in dieser Scheibe noch nicht migriert.

Verifiziert fuer den Dashboard-Control-Foundation-Task:

- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`

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

Teilfortschritt 2026-05-10, zentrale Action-Komponenten:

- `TableActionButton` und `EditorToolbarButton` delegieren intern an `DashboardButton`.
- `ImportButton` und `ExportButton` nutzen `DashboardActionButton`-Varianten, inklusive bestehendem Hidden-File-Input fuer Import.
- `HeaderBackButton` bleibt Navigations-Wrapper, nutzt aber die zentrale `DashboardButton`-Basis mit fester Action-Hoehe.

Verifiziert fuer den zentrale-Action-Komponenten-Task:

- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`

Teilfortschritt 2026-05-10, Shared-Dialog- und Error-Actions:

- `DeleteConfirmDialog` und `RejectDialog` nutzen zentrale Dashboard-Action-Buttons fuer ihre Footer-Actions.
- Der URL-Copy-Button in `RejectDialog` nutzt `CopyActionButton` als Icon-only Action.
- `ErrorBoundary` rendert Reload/Retry ueber `DashboardButton` statt rohe Utility-Buttons.

Verifiziert fuer den Shared-Dialog- und Error-Actions-Task:

- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`

Teilfortschritt 2026-05-10, Feature-Dialog-Footer:

- Feature-Dialog-Footer in Layout, Media, Kategorien, Social Media, Users, Form Builder und Email/Social-Template-Listen nutzen `DashboardActionButton`-Wrapper oder `DashboardButton`.
- `dialogBtnPrimary`, `dialogBtnSecondary` und `dialogBtnDestructive` werden im Dashboard nicht mehr re-exportiert.
- Mechanische React-Doctor-Hinweise in den beruehrten Dateien wurden bereinigt (`size-*`, Padding-Kurzform, Date-Hydration-Suppression, lokale Ref statt Render-State fuer `slugEdited`).

Verifiziert fuer den Feature-Dialog-Footer-Task:

- `rg -n "dialogBtn(Primary|Secondary|Destructive)" apps/dashboard/src -g '*.tsx'`
- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`

Hinweis: React Doctor meldet weiterhin bestehende Strukturhinweise fuer `AccountFormDialog`, `MediaPage` und den sequentiellen Media-Upload-Loop. Diese Scheibe aendert die Upload-Semantik und grosse Komponentenstruktur bewusst nicht.

Teilfortschritt 2026-05-10, Stufe-4-Visual-Smoke:

- Dashboard Production-Preview mit gemockter API gegen `http://127.0.0.1:5174` geprueft.
- Playwright-Screenshots fuer Formular-Liste, Formular-Erstellen-Dialog, Email-Template-Liste und Email-Template-Loeschen-Dialog erzeugt.
- Sichtpruefung: Tabellen-Actions, Header-Toolbars und Dialog-Footer zeigen keine offensichtlichen Ueberlappungen oder kaputten Button-Abstaende.

Verifiziert fuer den Stufe-4-Visual-Smoke:

- `BACKEND_URL=http://127.0.0.1:3999 VITE_API_URL=/api/v1 npm run preview -w @lmaa/dashboard -- --host 127.0.0.1`
- `cd /tmp/lmaa-pw && npx playwright test --browser=chromium --reporter=line`
- Screenshots: `/tmp/lmaa-dashboard-ui-consolidation/forms-list.png`
- Screenshots: `/tmp/lmaa-dashboard-ui-consolidation/forms-create-dialog.png`
- Screenshots: `/tmp/lmaa-dashboard-ui-consolidation/email-templates-list.png`
- Screenshots: `/tmp/lmaa-dashboard-ui-consolidation/email-template-delete-dialog.png`

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

Teilfortschritt 2026-05-10, Dropdown-/FilterDropdown-Basis:

- `DashboardCombobox` unterstuetzt jetzt Suche, Portal-Steuerung, Trigger-Icons, Trigger-Labels und aktive Option per Tastatur.
- `Dropdown.tsx` ist nur noch ein Adapter auf `DashboardCombobox`; lokale Portal-/Outside-Click-/Listbox-Logik wurde entfernt.
- `FilterDropdown` laeuft unveraendert ueber den neuen `Dropdown`-Adapter.

Verifiziert fuer den Dropdown-/FilterDropdown-Basis-Task:

- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`
- `npm run dev -w @lmaa/dashboard -- --host 127.0.0.1 --port 5174`
- `cd /tmp/lmaa-pw && npx playwright test lmaa-dropdown.spec.js --browser=chromium --reporter=line`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`

Teilfortschritt 2026-05-10, benannte native Dashboard-Selects:

- Native Selects in `RejectDialog`, `NotificationsTab`, `UserProfileFields` und `UserCreateCard` wurden auf `DashboardCombobox` umgestellt.
- Die betroffenen Notification-/Role-/Welcome-Template-Controls nutzen damit die gemeinsame Popover-/Listbox-Basis.
- Der globale Select-Checklistpunkt bleibt offen, weil weitere `<select>`-Fundstellen in anderen Feature-Dateien bestehen.

Verifiziert fuer den benannte-native-Selects-Task:

- `rg -n "<select|</select>" apps/dashboard/src/components/ui/RejectDialog.tsx apps/dashboard/src/features/system/settings/NotificationsTab.tsx apps/dashboard/src/features/system/users/UserProfileFields.tsx apps/dashboard/src/features/system/users/UserCreateCard.tsx`
- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`

Teilfortschritt 2026-05-10, Content-/System-/Social-Selects:

- Native Selects in `ShopDeleteReasonCard`, `BackgroundErrorsPage`, `TemplateAssignmentsSection`, `WidgetEditorPanel` und `ContentEditorPage` wurden auf `DashboardCombobox` umgestellt.
- Betroffene Status-, Widget-Typ-, Loeschmodus- und Social-Template-Auswahlen nutzen damit die gemeinsame Popover-/Listbox-Basis.
- Mechanische React-Doctor-Hinweise in den beruehrten Dateien wurden bereinigt (`size-*`, bewusste Zeitstempel-Hydration, eindeutiger Editor-Handlername).
- Der globale Select-Checklistpunkt bleibt offen, weil noch native Selects in `ReminderForm`, `ShopsPage`, `FieldConfigPanel` und `SubmissionConfigPanel` bestehen; `DashboardSelect` bleibt als zentraler technischer Wrapper bewusst erhalten.

Verifiziert fuer den Content-System-Social-Selects-Task:

- `rg -n "<select|</select>" apps/dashboard/src/features/content/shops/ShopDeleteReasonCard.tsx apps/dashboard/src/features/system/BackgroundErrorsPage.tsx apps/dashboard/src/features/social/components/TemplateAssignmentsSection.tsx apps/dashboard/src/features/system/WidgetEditorPanel.tsx apps/dashboard/src/features/content/pages/ContentEditorPage.tsx`
- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff` (Exit 0; verbleibende Hinweise sind bestehende Strukturhinweise ausserhalb dieser Select-Migration.)
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `rg -n "<select|</select>" apps/dashboard/src packages/ui/src -g '*.tsx'`

Teilfortschritt 2026-05-10, Shops- und Form-Builder-Selects:

- Native Selects in `ShopsPage`, `ReminderForm`, `FieldConfigPanel` und `SubmissionConfigPanel` wurden auf `DashboardCombobox` umgestellt.
- Der Export-Limit-Chooser, Reminder-Wiederholungen, Reminder-Email-Templates, Button-Action-Source-Felder, Submission-Email-Felder, Submission-Email-Templates und der Step-Typ-Chooser nutzen jetzt die gemeinsame Listbox-/Popover-Basis.
- `rg -n "<select|</select>" apps/dashboard/src packages/ui/src -g '*.tsx'` findet nur noch den nativen Select im zentralen `DashboardSelect`-Wrapper.
- Mechanische React-Doctor-Hinweise in den beruehrten Dateien wurden bereinigt; verbleibend sind bestehende Giant-Component-Hinweise fuer `ShopsPage` und `FieldConfigPanel`.

Verifiziert fuer den Shops-Form-Builder-Selects-Task:

- `rg -n "<select|</select>" apps/dashboard/src/features/content/shops/ShopsPage.tsx apps/dashboard/src/features/content/shops/ReminderForm.tsx apps/dashboard/src/features/templates/form-builder/FieldConfigPanel.tsx apps/dashboard/src/features/templates/form-builder/SubmissionConfigPanel.tsx`
- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff` (Exit 0; verbleibende Hinweise sind bestehende Giant-Component-Hinweise.)
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`
- `rg -n "<select|</select>" apps/dashboard/src packages/ui/src -g '*.tsx'`

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

Teilfortschritt 2026-05-10, Reminder-Controls:

- `ReminderForm` nutzt fuer das Custom-Intervall `DashboardNumberInput` und fuer die Notiz `DashboardTextarea`.
- Lokale `formInputClass`-Nutzung und rohe `<input>`/`<textarea>`-Controls wurden aus `ReminderForm` entfernt; DateTimePicker und Action-Buttons bleiben eigene spaetere Scheiben.

Verifiziert fuer den Reminder-Controls-Task:

- `rg -n "<input|<textarea|formInputClass" apps/dashboard/src/features/content/shops/ReminderForm.tsx`
- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`

Teilfortschritt 2026-05-10, Widget-Editor-Controls:

- `WidgetEditorPanel` nutzt fuer Text-, URL- und Hoehenfelder `DashboardInput`/`DashboardNumberInput`.
- Widget-Beschreibung, HTML-Snippet, Auto-Origin-Anzeigen und CSP-Expert-Felder nutzen `DashboardTextarea`.
- Die alten Widget-Utility-Klassen fuer Text-/Textarea-Controls werden in dieser Datei nicht mehr verwendet; die Checkbox bleibt fuer den Choice-Slice bewusst unveraendert.

Verifiziert fuer den Widget-Editor-Controls-Task:

- `rg -n "<input|<textarea|textInputClass|textAreaClass|readOnlyTextAreaClass" apps/dashboard/src/features/system/WidgetEditorPanel.tsx`
- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`

Teilfortschritt 2026-05-10, Field-Config-Controls:

- `FieldConfigPanel` nutzt fuer Label-, Field-Name-, Placeholder- und Subtext-Felder `DashboardInput`.
- Paragraph-/Options-Textareas nutzen `DashboardTextarea`; Max-Chars-, Rows- und Validation-Min/Max-Felder nutzen `DashboardNumberInput`.
- Rohe Inputs in dieser Datei sind nur noch die bestehenden Checkboxen fuer den spaeteren Choice-Slice.

Verifiziert fuer den Field-Config-Controls-Task:

- `rg -n "<input|<textarea|h-9 px-3|focus:border-\\[var\\(--color-primary\\)\\]" apps/dashboard/src/features/templates/form-builder/FieldConfigPanel.tsx`
- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff` (Exit 0; verbleibender Hinweis ist der bestehende Giant-Component-Hinweis.)
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`

Teilfortschritt 2026-05-10, Submission-Config-Controls:

- `SubmissionConfigPanel` nutzt fuer statische Email-Empfaenger, Email-Betreff, Success-Redirect-URL und Success-Headline `DashboardInput`.
- Lokale `inputClass`-Definitionen und rohe Text-/Email-/URL-Inputs wurden aus der Datei entfernt.

Verifiziert fuer den Submission-Config-Controls-Task:

- `rg -n "<input|inputClass|focus:ring-1|focus:border-\\[var\\(--color-primary\\)\\]" apps/dashboard/src/features/templates/form-builder/SubmissionConfigPanel.tsx`
- `npm run lint -w @lmaa/dashboard`
- `npm run typecheck -w @lmaa/dashboard`
- `npx -y react-doctor@latest apps/dashboard --verbose --diff`
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`

Teilfortschritt 2026-05-10, Shared-Shop-Edit-Inputs:

- `packages/ui/src/ShopEditForm.tsx` nutzt fuer Name, URL, Contact Email, Headquarters, Koordinaten und Shipping `InputPrimitive`.
- Die alte `formInputClass`-Nutzung wurde aus `ShopEditForm` entfernt; Valid-Fehler laufen ueber den `invalid`-State der Field-Primitive.
- Mechanische Icon-Groessen wurden auf `size-*` normalisiert.

Verifiziert fuer den Shared-Shop-Edit-Inputs-Task:

- `rg -n "<input|formInputClass|w-4 h-4" packages/ui/src/ShopEditForm.tsx`
- `npm run lint -w @lmaa/ui`
- `npm run typecheck -w @lmaa/ui`
- `npx -y react-doctor@latest packages/ui --verbose --diff` (Exit 0; verbleibender Hinweis ist der bestehende Giant-Component-Hinweis.)
- `npm run lint`
- `npm run typecheck`
- `npm run test --workspaces --if-present`
- `npm run build`

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
