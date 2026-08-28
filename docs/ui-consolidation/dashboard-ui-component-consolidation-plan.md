# Dashboard UI Component Consolidation Plan

Stand: 2026-05-11

Quelle: aktueller Code in `apps/dashboard/src`, `packages/ui/src`, `packages/shared/styles/tokens.css` sowie der bestehende Button-Plan in `docs/dashboard-button-consolidation-plan.md`.

## Team-Abgleich

Zur Analyse wurden drei parallele Sub-Agenten eingesetzt:

- Formular-Controls: Inputs, Selects, Comboboxen, Date/Time, Stepper, Checkboxen und Switches.
- Navigation und Listen: Tabs, Segments, Dropdowns, Context-Menues, Table-Sort-Header, Drag-Handles und Collapsibles.
- Shared Primitives: `@lmaa/ui`, Tokens, Dialoge, Surfaces, Card-/Section-Internals und Kritik am Button-Plan.

Der Orchestrator-Entscheid nach Abgleich:

- Der bestehende Button-Plan wurde am 2026-05-11 fuer Dashboard-Action-Buttons auf `h-8` und fuer icon-only auf `size-8` angehoben.
- Andere Controls werden nicht ueber `DashboardActionButton` geloest. Sie bekommen eigene Primitives.
- Standard-Formfelder und Select-/Combobox-Trigger sollen im Zielbild `h-8` bekommen.
- Sichtbare Selects und Dropdowns sind immer Custom-Controls auf `DashboardSelect`/`DashboardCombobox`/`DashboardListbox`; native `<select>` duerfen nur als versteckter State-/Fallback-Anker begruendet werden.
- `h-9` ist danach keine stillschweigende Formular-Default-Hoehe mehr, sondern eine explizite Large-/Editor-/Kalender-Ausnahme.
- Dropdown-, Select- und Menu-Items bekommen als Default `h-8`; kompakte Tabellen- oder Toolbar-Ausnahmen duerfen `h-8` sein.
- Alle Farben, Fokus-Ringe, Radii, Disabled-States, Hover-States und Z-Index-Werte muessen aus gemeinsamen Tokens kommen.
- Field-Primitives duerfen `w-full` nicht hart in der Basis erzwingen. Explizite Breiten wie `w-44`, `w-24` oder `w-12` muessen in dichten Grid-/Flex-Zeilen Vorrang haben, damit Slug-, Prefix- und Add-on-Spalten sichtbar bleiben.
- Sortier- und Drag-Handles nutzen visuell einheitlich das Phosphor-`ListIcon` mit `weight="bold"`; `DotsSixVerticalIcon` ist fuer Dashboard-Handles keine Ziel-Ikone mehr.
- Feature-Screens mit Page/URL- oder Mode-Auswahl verwenden den Dashboard-`SegmentSwitch`-Wrapper; direkte `DashboardSegmentedControl`-Nutzung bleibt fuer primitive-nahe Sonderfaelle.
- `SegmentedControlPrimitive` darf durch Padding nicht hoeher als Field-Controls werden. Der Container traegt die `h-8`-Aussenhoehe, Segmente/Pill liegen mit symmetrischem 2px-Inset aus 1px Border plus `p-px` innen, der aktive Zustand bekommt einen klaren Fill plus schwache echte Border ohne Shadow und Segment-Buttons zeigen keinen Fokus-Ring. Innere Radii werden aus `--radius-control` minus Border/Padding-Inset berechnet, nicht fix in Pixeln gesetzt.
- Dropdown- und Combobox-Items verwenden fuer Hover und keyboardaktiven Zustand ausschliesslich definierte Interaktionstokens wie `--ds-control-hover-bg`; undefinierte Alias-Tokens wie `--ds-hover` sind in gemeinsamen Primitives nicht erlaubt.
- Portal-Listboxen und Portal-Menues innerhalb von Dialogen muessen den aktiven Overlay-Z-Index aus dem Overlay-Kontext erben und mit kleinem Offset darueber liegen; globale Basis-Z-Index-Tokens allein duerfen Dialog-Popover nicht hinter der Card verschwinden lassen.
- Enum-/Status-Comboboxen mit variierenden Label-Laengen verwenden `DashboardCombobox minWidthFromOptions`, statt feste `w-*`-Breiten zu raten. Die Trigger-Mindestbreite wird aus allen Optionslabels gemessen und bleibt opt-in, damit dichte Layouts nicht unbeabsichtigt wachsen.
- Icon-Picker-Selections sind keine normale Outline-Primary-Action. Der aktive Icon-Button nutzt lokal einen leuchtenden Active-Fill, Primary-Border und ein weisses Icon, ohne Shadow oder globale Button-Variant anzupassen.

## Zielbild

Das Dashboard bekommt eine einheitliche UI-Foundation mit klarer Schichtung:

1. `packages/shared/styles/tokens.css`: Design-Tokens fuer Hoehen, Farben, Fokus, Radius, Table, Menu, Overlay und Control-Sizes.
2. `packages/ui`: Framework-nahe Primitives ohne Dashboard-i18n und ohne fachliche Action-Semantik.
3. `apps/dashboard/src/components/ui`: Dashboard-Wrapper mit i18n, Phosphor-Icons, Fachsemantik und App-spezifischem Verhalten.
4. Feature-Dateien: keine lokalen Hoehen-, Farb- oder Fokusklassen fuer Standard-Controls mehr. Features waehlen nur Primitive, Variante, Status, Label-Key und Daten.

## Kritische Anpassung am Button-Plan

Der Button-Plan ist inhaltlich richtig, aber noch zu app-lokal. Wenn `Dialog`, `FormPrimitives`, `DashboardSection`, `Tabs`, Selects und Overlay-Komponenten in `@lmaa/ui` weiter eigene Klassen setzen, entsteht sofort neue Drift.

Anpassungen fuer das Gesamtbild:

- `DashboardActionButton` ist nur fuer Actions: speichern, loeschen, importieren, exportieren, bearbeiten, kopieren, bestaetigen.
- Tabs, Segment-Auswahl, Select-Trigger, Menu-Items, Drag-Handles, Sort-Header und Toggles sind keine Action-Buttons, auch wenn sie technisch `<button>` nutzen.
- Der Button-Plan braucht eine klare Abgrenzung: Form-Submit in grossen Auth-/Setup-Formularen oder Marketing-Formularen kann eine `formSubmit`/`large`-Ausnahme sein. Dashboard-Panel- und Table-Actions bleiben `h-8`.
- `dialogBtn*`, `formBtnBaseClass` und lokale `--ds-btn-*` Klassen in Feature-Dateien sind Hintertueren und muessen in der ersten Primitive-Phase adressiert werden.
- Neue generische i18n Keys aus dem Button-Plan wie `common.import`, `common.export`, `common.create`, `common.approve` muessen vor Migration wirklich in `DashboardMessages`, `de` und `en` angelegt werden.

## Befund

| Bereich                              |      Ist-Befund | Code-Referenzen                                                                            | Ziel                                                                                           |
| ------------------------------------ | --------------: | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Rohe Inputs                          | 107 Fundstellen | `rg '<input' apps/dashboard/src packages/ui/src --glob '*.tsx'`                            | `DashboardInput`, `DashboardNumberInput`, `DashboardCheckboxField`, hidden inputs als Ausnahme |
| Rohe Selects                         |  17 Fundstellen | `RejectDialog.tsx:242`, `ReminderForm.tsx:91`, `NotificationsTab.tsx:131`                  | `DashboardSelect` oder `DashboardCombobox`                                                     |
| Rohe Textareas                       |  10 Fundstellen | `ReminderForm.tsx:172`, `WidgetEditorPanel.tsx:164`                                        | `DashboardTextarea`, kein `h-9` aus `formInputClass`                                           |
| Segment Controls                     |   24 Referenzen | `SegmentedControl.tsx:124`, `SegmentSwitch.tsx:16`                                         | ein `DashboardSegmentedControl`                                                                |
| Switch-/Toggle-Nutzung               |   19 Referenzen | `ToggleSwitch.tsx:25`, `NotificationsTab.tsx:119`                                          | `DashboardSwitchField` plus `ToggleSwitchPrimitive`                                            |
| Dropdown/Menu/Select-artige Controls |   64 Referenzen | `Dropdown.tsx:164`, `FilterDropdown.tsx:56`, `MultiSelect.tsx:172`, `RegionSelect.tsx:164` | gemeinsame Popover/Listbox/Menu-Basis                                                          |
| Tabellen-Sortierung                  |   75 Referenzen | `Table.tsx:185`, `Table.tsx:197`                                                           | `TableSortHeader`                                                                              |
| Drag-and-Drop/Handles                |  190 Referenzen | `Sidebar.tsx:121`, `SubmissionConfigPanel.tsx:101`                                         | `DashboardDragHandle`, gemeinsame Sensors                                                      |

## Konsolidierungsplan nach Komponenten

| Bereich                    | Aktueller Drift                                                                                                                              | Ziel-Primitive                                                           |                                                          Default-Hoehe | Ausnahmen                                                                                 | Migration                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------: | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Eingabefelder              | `formInputClass` ist `h-9`, Feature-Dateien setzen eigene `inputClass`/`selectClass`; `focus:ring-1`, `focus:border-*` und `bg-*` variieren. | `DashboardField`, `DashboardInput`                                       |                                                                  `h-8` | `h-8` compact in Toolbars/Tables, `h-9` large nur explizit                                | zuerst `FormPrimitives.tsx`, danach `FieldConfigPanel`, `SubmissionConfigPanel`, `ReminderForm`, System Settings |
| Textareas                  | `formInputClass` wird auch fuer Textareas genutzt, dadurch falsche fixe Hoehe.                                                               | `DashboardTextarea`                                                      |                                   keine fixe Hoehe, `min-h` ueber rows | CodeMirror/Markdown/JSON bleiben Editor-Primitives                                        | Textareas aus `formInputClass` herausloesen                                                                      |
| Native Selects             | Native Selects duplizieren `h-9`, `px-3`, `focus:*` lokal und weichen visuell von den Dashboard-Custom-Dropdowns mit Caret/Listbox ab.       | `DashboardSelect` auf `DashboardListbox`                                 |                                                                  `h-8` | keine sichtbaren nativen Selects; compact `h-8` nur als Custom-Trigger in dichten Headern | sichtbare native `<select>` Fundstellen ersetzen, Hidden-Fallbacks explizit markieren                            |
| Combobox/Dropdown          | `Dropdown` hat statische IDs, Trigger `h-9`, Optionen `h-8`; `FilterDropdown` reicht Label/ARIA nicht sauber durch.                          | `DashboardCombobox`, `DashboardListbox`, `DashboardPopover`              |                                            Trigger `h-8`, Option `h-8` | lange Multi-Value Trigger duerfen auto-height                                             | `Dropdown` intern umbauen, dann `FilterDropdown` anbinden                                                        |
| MultiSelect/RegionSelect   | `MultiSelect`, `RegionSelect`, Country-/Social-Selects haben eigene Portal- und Option-Styles.                                               | `DashboardMultiSelect` auf `DashboardListbox`                            |                                            Trigger `h-8`, Option `h-8` | Chips duerfen eigene Hoehe behalten                                                       | gemeinsame Popover-/Option-Komponenten extrahieren                                                               |
| Tabs                       | `@lmaa/ui/Tabs` hat keine `aria-controls`, `aria-labelledby`, roving tabindex oder Arrow-Key-Verhalten.                                      | `DashboardTabs`                                                          |                                                                  `h-8` | compact `h-8` nur in echten Toolbars; Content-Tabs bleiben sichtbar kraeftig              | `Tabs.tsx` robust machen, Dashboard-Wrapper anlegen                                                              |
| Segment-Auswahl            | `SegmentedControl` ist `h-8`, `SegmentSwitch` hat `h-6`/`h-8`, lokale Toggle-Gruppen existieren.                                             | `DashboardSegmentedControl`                                              |                                           compact `h-8`, default `h-8` | icon-only `size-8`                                                                        | `SegmentSwitch` entfernen oder intern auf den neuen Primitive legen                                              |
| Toggles/Switches           | `ToggleSwitch` ist visuell ok, aber Feldzeilen und Labels sind nicht standardisiert; Checkboxen sind uneinheitlich.                          | `DashboardSwitchField`, `DashboardCheckboxField`, `CheckboxPrimitive`    |                                         Row `h-8`; Mark/Switch kleiner | Sidebar/kompakte Listen duerfen `min-h-8`                                                 | native Checkboxen und `SubtextCheckbox` migrieren                                                                |
| Table-Sort-Header          | Sort-Button ist inline in `DataTable`, keine lokalisierte Sort-Ansage, String-Sortierung ist fest auf `de`.                                  | `TableSortHeader`                                                        |                                                        `h-8` im Header | nicht-sortierbare Header bleiben Text                                                     | `DataTable` extrahieren, Locale als Prop/Context                                                                 |
| Drag-Handles               | Sidebar nutzt `tabIndex={-1}` und hart deutschen Text; Submission-Step nutzt `span`; Builder-Karten nutzen grosse Drag-Flächen.              | `DashboardDragHandle`, `useDashboardDndSensors`                          |                                                               `size-8` | Drag-Overlay/Karte objektabhaengig                                                        | Handles ersetzen, Icon optisch exakt zentrieren, KeyboardSensor und i18n-ARIA einfuehren                         |
| Dropdown-Items/ContextMenu | `ContextMenu` nutzt eigene Portal-Logik und Inline-Danger-Style wegen globaler Button-CSS-Regel.                                             | `DashboardMenu`, `DashboardMenuItem`                                     |                                                                  `h-8` | compact `h-8` fuer Table-/Toolbar-Menues                                                  | globale `--ds-btn-*` Selektor-Falle entfernen                                                                    |
| Stepper/Number             | Number-Inputs sind lokale `type=number` Felder; Einheiten und Step-Regeln sind verstreut.                                                    | `DashboardNumberInput`, `DashboardStepper`                               |                                                                  `h-8` | compact `h-8` in dichten Buildern; Stepper-Aussenabstand und Button-Padding symmetrisch   | `FieldConfigPanel`, `ReminderForm`, `HeroBannerTab` zuerst                                                       |
| DateTimePicker             | Trigger ohne Zielhoehe, lokale Time-Inputs, hardcodierte Texte.                                                                              | `DashboardDateTimePicker` auf `DashboardPopover`, `DashboardNumberInput` |                                                          Trigger `h-8` | Kalendertage `w-9 h-9` erlaubt                                                            | i18n Messages ergaenzen, Time-Stepper zentralisieren                                                             |
| IconPicker                 | Suchfeld `py-1`, None-Button `h-8`, Icon-Buttons `h-9`.                                                                                      | `DashboardIconPicker`                                                    | Search `h-8`, Icon-Zelle `size-8` oder `size-9` als explizite Variante | grosse Icon-Zellen erlaubt wegen Erkennbarkeit                                            | auf Field/Listbox/Grid-Primitive setzen                                                                          |
| Collapsible/Disclosure     | `DashboardSection`, Sidebar-Gruppen, Analytics-Listen und globale Sidebar Expand/Collapse haben eigene Toggle-Optik.                         | `DisclosureButton`, `CollapsibleRegion`                                  |                                                   `size-8` fuer Toggle | Sidebar-Gruppen `min-h-8`                                                                 | Collapse-Button zentralisieren, ARIA/i18n vereinheitlichen                                                       |
| Shared Primitive-Internals | Tokens, Radius, Fokus, Overlay und Icon-Familie driften zwischen `@lmaa/ui` und Dashboard.                                                   | `controlFoundation`, `surfaceFoundation`, `overlayFoundation`            |                                                        Token-gesteuert | Frontend-spezifische Varianten in `@lmaa/ui` duerfen eigene Wrapper behalten              | Foundation zuerst, danach Features                                                                               |

## Ziel-API

### Control Foundation

```ts
type DashboardControlSize = "compact" | "default" | "large";
type DashboardTone = "neutral" | "primary" | "danger" | "success" | "warning";

const controlSize = {
  compact: "h-8",
  default: "h-8",
  large: "h-9",
} as const;
```

### Beispiele

```tsx
<DashboardField label={messages.users.editCard.email} error={emailError}>
  <DashboardInput value={email} onChange={setEmail} type="email" />
</DashboardField>

<DashboardSelect
  value={role}
  onChange={setRole}
  options={roleOptions}
  ariaLabel={messages.users.editCard.role}
/>

<DashboardSegmentedControl
  size="compact"
  value={mode}
  onChange={setMode}
  options={modeOptions}
/>

<TableSortHeader
  label={columnHeader}
  state={sortState}
  onToggle={toggleSort}
/>

<DashboardDragHandle
  listeners={listeners}
  attributes={attributes}
  label={messages.common.moveItem}
/>
```

## Explizite Ausnahmen

| Ausnahme           | Erlaubte Abweichung        | Bedingung                                                                  |
| ------------------ | -------------------------- | -------------------------------------------------------------------------- |
| Action-Buttons     | `h-8`/`size-8`             | nur fuer echte Dashboard-Actions aus dem Action-Katalog                    |
| Compact Controls   | `h-8`                      | Table Header, Toolbar, kleine Header-AddOns, explizit per `size="compact"` |
| Large Controls     | `h-9`                      | Auth-/Setup-Submit, grosse Form-Entry-Screens, explizit per `size="large"` |
| Textareas/Editoren | keine fixe `h-8`           | rows/minRows/Editor-Height bestimmen die Flaeche                           |
| Kalender-Tage      | `w-9 h-9`                  | Date-Picker Grid, wegen Trefferflaeche                                     |
| IconPicker Grid    | `size-8` oder `size-9`     | explizite Icon-Erkennbarkeit, kein allgemeiner Button-Default              |
| Drag-Overlay       | objektabhaengig            | Overlay kopiert Karten-/Listenhoehe, nicht Handle-Hoehe                    |
| Hidden Inputs      | keine visuelle Hoehe       | sichtbarer Trigger folgt Button- oder Field-Primitive                      |

## Migrationsplan

### Phase 1: Foundation und Tokens

- Neue Tokens in `packages/shared/styles/tokens.css` definieren:
  - `--ds-control-h-action: 2rem`
  - `--ds-control-h-field: 2rem`
  - `--ds-control-h-field-large: 2.25rem`
  - `--ds-control-h-menu-item: 2rem`
  - `--ds-control-h-icon: 2rem`
  - `--ds-focus-ring`, `--ds-focus-ring-offset`, `--ds-overlay-z-*`
- Uno/Tailwind-Radius und CSS-Variablen angleichen.
- Undefinierte Tokens wie `--ds-text-secondary`, `--ds-bg-hover`, `--ds-border-focus` ersetzen oder definieren.
- Globale Button-CSS-Regeln, die Menueitems beeinflussen, entfernen.

### Phase 2: Shared UI Primitives

- In `packages/ui` visuelle Primitives einfuehren:
  - `ButtonPrimitive`, `IconButtonPrimitive`
  - `ControlTrigger`, `FieldShell`, `InputPrimitive`, `TextareaPrimitive`
  - `ListboxPopover`, `MenuPrimitive`, `MenuItemPrimitive`
  - `TabsPrimitive`, `SegmentedControlPrimitive`
  - `DialogFooterPrimitive`, `SurfacePrimitive`
- `FormPrimitives.tsx` auf die neue Foundation umbauen und `formInputClass` nicht mehr fuer Textareas verwenden.

### Phase 3: Dashboard Wrapper

- In `apps/dashboard/src/components/ui` app-spezifische Wrapper einfuehren:
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
  - `TableSortHeader`
  - `DashboardDragHandle`
  - `DisclosureButton`
- i18n und Phosphor-Icons bleiben im Dashboard-Layer.

### Phase 4: High-Drift Migration

Reihenfolge:

1. `FormPrimitives.tsx`, `Dropdown.tsx`, `FilterDropdown.tsx`, `Tabs.tsx`, `SegmentedControl.tsx`, `SegmentSwitch.tsx`, `Table.tsx`, `ContextMenu.tsx`, `ToggleSwitch.tsx`.
2. `FieldConfigPanel`, `SubmissionConfigPanel`, `ReminderForm`, `WidgetEditorPanel`, `NavManagerPage`, Footer-Builder.
3. System Settings, User Forms, Social-Forms, Media Sidebar, Shops Page.
4. Shared `MultiSelect`, `RegionSelect`, Country-/Social-Selects.
5. Dialog-Footer und Overlay-Footer gegen Button- und Control-Foundation pruefen.

### Phase 5: Cleanup

- Lokale Klassen wie `inputClass`, `selectClass`, `labelClass`, `formBtnBaseClass`, direkte `--ds-btn-*` Klassen aus Feature-Dateien entfernen.
- Nicht mehr referenzierte i18n Keys loeschen.
- `SegmentSwitch` entweder entfernen oder als Alias auf `DashboardSegmentedControl` behalten.
- `dialogBtn*` Class-Exports entfernen, sobald Dialog-Footer ueber Button-Primitives laufen.
- Doppelte Overlay-/Popover-Logik abbauen.

### Phase 6: Gates

- `npm run typecheck -w @lmaa/ui`
- `npm run typecheck -w @lmaa/dashboard`
- `npm run lint -w @lmaa/ui`
- `npm run lint -w @lmaa/dashboard`
- `npm run build:dashboard`
- Static `rg` Gates:
  - keine neuen rohen `h-9` Standard-Felder ohne `size="large"`
  - keine direkten `focus:ring-*`/`focus:border-*` in Feature-Controls
  - keine direkten `--ds-btn-*` Klassen in Menueitems oder Feature-Controls
  - keine neuen sichtbaren rohen `<select>`, `<textarea>`, checkbox-Inputs ohne Primitive-Ausnahme
  - sichtbare Auswahlfelder muessen `DashboardSelect`/`DashboardCombobox` mit Custom-Caret, Listbox-Rollen und gemeinsamen Popover-Tokens nutzen
- UI Checks:
  - Header Controls
  - Tabellen mit Sticky Header und Sortierung
  - Dialog Footer
  - Dropdowns und Menues
  - Builder Drag-and-Drop
  - Light/Dark Theme, falls beide aktiv sind

## Gesamtentscheidung

Die Konsolidierung darf nicht nur gleiche Labels oder Icons zusammenziehen. Sie muss die UI-Sprache vereinheitlichen:

- Actions kompakt: `h-8`.
- Felder ruhig und lesbar: `h-8`.
- Optionen und Menues scanbar: `h-8`.
- Kompakte Header-/Table-Ausnahmen explizit: `h-8`.
- Grosse Form-/Editor-Ausnahmen explizit: `h-9` oder Content-Hoehe.
- Jedes sichtbare Control bekommt eine eindeutige Rolle, zentrale Tokens, i18n-faehige ARIA-Texte und eine klar benannte Komponente.
