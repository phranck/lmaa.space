# Shop Logo Background Color — Design

**Date:** 2026-05-13
**Status:** Draft (awaiting user review)

## Goal

Im Dashboard (Shop-Editor und Submission-Editor) bekommt der Admin ein Farbfeld, mit dem die Hintergrundfarbe des Shop-Logos pro Shop manuell bestimmt werden kann. Die Farbe wirkt auf die Website-Detailseite (`ShopAvatar.astro`), die Shop-Cards (`ShopCardReact.tsx`) und das Live-Vorschau-Thumbnail im Dashboard. Ersatz für die zurückgebaute Luminanz-Analyse — der Admin entscheidet, nicht eine Heuristik.

## Scope (in)

- Neue nullable DB-Spalte `logo_background_color` auf `shops` und `submissions`.
- Color-Picker (HTML5 `type="color"`) + Hex-Text-Input + Reset-Button als neuer Sub-Block in `ShopPreviewImageSection.tsx`.
- Live-Vorschau: Thumbnail in der Sektion zeigt die gewählte Farbe sofort.
- Backend-Read-/Write-Pfade auf shops + submissions inklusive `reviewSubmission`-Approval-Brücke.
- Frontend-Caller (`ShopAvatar.astro`, `ShopCardReact.tsx`) bekommen `logoBackgroundColor`-Prop und wenden sie via inline `style` an.
- `@lmaa/shared`: neuer Helper `resolveLogoBackground(color: string | null | undefined): string` mit `DEFAULT_LOGO_BACKGROUND = "#fafaf9"` als Single-Source-of-Truth.
- Zod-Validation `^#[0-9a-fA-F]{6}$` an allen API-Edges.

## Scope (out)

- Backfill bestehender Shops mit berechneten Farben — Feld bleibt initial null, Default-Fallback greift im Frontend.
- Mehrere Themes (Dark-Mode-Variante etc.) — eine Farbe pro Shop, gilt überall.
- Preset-Liste / Quick-Picks im UI — User-Entscheidung: freier Color-Picker reicht.
- Migration des kosmetischen Restdiffs in `public-filtered.ts` oder der untracked Drizzle-Migrations 0055/0056 (Logo-Luminanz-Rückbau) — separates Cleanup.

## Non-Goals

- Wiederbelebung der automatischen Helligkeits-Analyse. Diese Spec ersetzt sie explizit.
- Wirkung auf andere Surfaces (Email-Templates, Social-Media-Post-Bilder, Open-Graph-Cards). Nur Detail-Seite, Cards, Dashboard-Preview.

---

## Architecture

**Variante B** (gewählt): Einzelne Hex-Spalte + `@lmaa/shared`-Helper.

- DB: identische `logo_background_color text` Spalte auf shops + submissions, nullable.
- Backend: passthrough, keine Business-Logik. Field-Mappings in Repos analog zu `ogImage`.
- Approval: `reviewSubmission` kopiert das Feld beim Approve in den neuen Shop (gleiches Pattern wie `ogImage`, `contactEmail` etc.).
- Shared-Package: `resolveLogoBackground()` als zentraler Default-Fallback, damit Default-Hex genau eine Stelle hat.
- Frontend/Dashboard: inline `style="background-color: ${resolved}"` ersetzt die bestehende hartkodierte `bg-stone-50`-Klasse.

Alternative-Verworfen:
- **Inline-Default je Konsument** (drei Stellen mit `color ?? "#fafaf9"`) — DRY-Verletzung, abgelehnt.
- **JSONB Style-Blob `display_style`** — YAGNI, aktuell genau ein Feld geplant. Abgelehnt.

---

## Data Model

### Migration `0057_<name>` (Drizzle-generiert)

Generierung via `drizzle-kit generate` aus `apps/backend/`. Anwendung beim Backend-Start via Migrator-Script.

**Tabelle `shops`** (Schema: `apps/backend/src/db/schema.ts:55-84`)

```sql
ALTER TABLE shops ADD COLUMN logo_background_color text;
```

**Tabelle `submissions`** (Schema: `apps/backend/src/db/schema.ts:258`-Bereich, ogImage-Zeile)

```sql
ALTER TABLE submissions ADD COLUMN logo_background_color text;
```

Beide nullable, kein DB-Default, kein Constraint. Validation am API-Edge (Zod).

### Drizzle-Schema

```ts
// In shops-Tabelle, direkt nach ogImage:
logoBackgroundColor: text("logo_background_color"),

// In submissions-Tabelle, direkt nach ogImage:
logoBackgroundColor: text("logo_background_color"),
```

---

## @lmaa/shared

### Neue Datei `packages/shared/src/utils/logo-background.ts`

```ts
export const DEFAULT_LOGO_BACKGROUND = "#fafaf9"; // stone-50

export function resolveLogoBackground(color: string | null | undefined): string {
  return color && color.length > 0 ? color : DEFAULT_LOGO_BACKGROUND;
}
```

### Type-Erweiterung

`Shop` und `Submission` Typen (in `packages/shared/src/types/`) bekommen:
```ts
logoBackgroundColor: string | null;
```

### Export

`packages/shared/src/index.ts` exportiert `resolveLogoBackground` und `DEFAULT_LOGO_BACKGROUND`.

### Build-Constraint

Nach Änderung muss `npm run build -w @lmaa/shared` laufen (tsup dual-format ESM+CJS), bevor Backend/Dashboard/Frontend dev-Server starten. tsup-`prepare`-Hook fehlt aktuell — entsprechende Wartung ist außerhalb dieses Specs.

---

## @lmaa/contracts (Zod)

Bestehende `shopUpdateSchema` und `submissionUpdateSchema` (genaue Namen werden beim Plan-Write geprept) bekommen:

```ts
logoBackgroundColor: z
  .string()
  .regex(
    /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/,
    "Must be a 6-digit hex color or 8-digit hex with alpha",
  )
  .nullable()
  .optional()
```

- Akzeptiert `#RRGGBB` (volle Farbe) und `#RRGGBBAA` (mit Alpha-Anteil). Keine 3-stelligen Kurzformen, keine `rgb()`/`hsl()`-Strings.
- Nullable → expliziter Reset auf Default-Fallback möglich.
- Optional → Field-Passthrough-Pattern bleibt kompatibel (`...(data.logoBackgroundColor !== undefined ? { logoBackgroundColor } : {})`).

> **Addendum 2026-05-13:** Initial-Release des Specs sah nur 6-stelligen Hex vor. Nach UX-Review wurde `#RRGGBBAA` (Alpha-Channel) nachgezogen, damit Shops auch teiltransparente Logo-Hintergründe einsetzen können. Frontend-Konsumenten und Helper sind unverändert, weil `resolveLogoBackground()` den String unbesehen weiterreicht und Browsers `background-color: #RRGGBBAA` nativ rendern.

---

## Backend Read Paths

SELECT-Listen in folgenden Files erweitern (raw SQL + Drizzle-Selects):

| File | Lines | Anpassung |
|------|-------|-----------|
| `apps/backend/src/repositories/admin-shops.ts` | 68, 117 | `s.logo_background_color as "logoBackgroundColor"` nach `og_image as "ogImage"` |
| `apps/backend/src/repositories/admin-submissions.ts` | 30 (Interface), SELECT-Stellen | Feld hinzufügen |
| `apps/backend/src/repositories/public.ts` | 31, 177, 198, 243, 564 | Field zur Public-Shop-Projection |
| `apps/backend/src/repositories/public-filtered.ts` | 217, 248, 292 | Field zu Category/Search-Listings |

Alle Stellen werden bei Plan-Write nochmal mit Line-Numbers verifiziert.

---

## Backend Write Paths

### Shop-Update

`apps/backend/src/repositories/admin-shops.ts` — generischer Shop-Update-Pfad (Pattern wie `ogImage` in den anderen Field-Passthrough-Patches).

### Submission-Update

`apps/backend/src/repositories/admin-submissions.ts:267` — Field-Passthrough-Block bekommt:
```ts
...(data.logoBackgroundColor !== undefined
  ? { logoBackgroundColor: data.logoBackgroundColor }
  : {}),
```

### Approval-Brücke

`apps/backend/src/repositories/admin-submissions.ts:219-233` — im `tx.insert(shops).values({ ... })`-Block nach `ogImage: submission.ogImage,` ergänzen:
```ts
logoBackgroundColor: submission.logoBackgroundColor,
```

### Services + Routes

Service-Layer reicht das Feld nur durch (keine Business-Logik). Routes (`apps/backend/src/routes/admin/shops.ts`, `admin/submissions.ts`) erhalten das Feld implizit über die erweiterten Zod-Schemas — kein dedizierter Endpoint nötig.

---

## Dashboard UI

### `ShopPreviewImageSection.tsx`

Bestehende Sektion behält Thumbnail + URL-Input + Buttons. Color-Control + Reset stehen in derselben Zeile wie `Neu laden`/`Übernehmen` direkt unter dem URL-Input:

```
┌─ URL + External-Link ─────────────────────────────────────────┐
│ [Logo-Bg-Label] [DashboardColorInput] [Reset]    [Neu laden] [Übernehmen]
└───────────────────────────────────────────────────────────────┘
```

- Picker + Hex-Feld sind als gemeinsame Einheit `DashboardColorInput` (`apps/dashboard/src/components/ui/DashboardColorInput.tsx`) gebaut.
- Reset-Button setzt Wert auf `null` (der Picker selbst kann nicht "leeren").
- **Live-Vorschau:** das Thumbnail bekommt `style={{ backgroundColor: resolveLogoBackground(currentColor) }}` → Admin sieht direkt was rauskommt.

### `DashboardColorInput` (Addendum 2026-05-13)

Custom-Control, das Swatch + Hex-Eingabe als eine Einheit kapselt. Verwendet `react-colorful` (≈3kB, MIT) für den eigentlichen Color-Picker mit Alpha-Slider.

- Klick auf Swatch öffnet/schließt ein Picker-Popover mit `HexAlphaColorPicker`.
- Hex-Eingabe ist ein `HexColorInput alpha prefixed`, der ungültige Zeichen schon beim Tippen verhindert.
- Beide Wege schreiben in denselben controlled-state-Pfad (`value` / `onChange`), Picker und Hex sind also bidirektional verknüpft.
- Empty-Input → `null` (Reset über Hex-Feld funktioniert).
- Checkerboard-Background unter dem Swatch macht Alpha-Werte sofort sichtbar.
- **Visuelle Form (Addendum 2026-05-13):** Swatch ist ein perfekter Kreis (`w-8 h-8 rounded-full`), Hex-Feld eine Pill (`rounded-full`) mit 2px Abstand zum Swatch (`ml-[2px]`). Im Hex-Feld rechts integriert: ein `XCircleIcon` (Phosphor, duotone) als Reset-Trigger — nur sichtbar wenn `value !== null`, Klick ruft `onChange(null)`. Der externe "Zurücksetzen"-Button entfällt damit.

CSS ist von `react-colorful` per `microbundle --css inline` ins JS-Bundle gemerged — kein separater CSS-Import nötig.

> **Addendum 2026-05-13 (Pipette zurückgebaut):** Initial-Version dieses Addendums sah einen "Vom Bildschirm wählen"-Button via [`use-eye-dropper`](https://www.npmjs.com/package/use-eye-dropper) vor. Library wrappt nur die native [`EyeDropper` API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper) (Chrome/Edge/Opera 95+) — kein `getDisplayMedia`-Polyfill. Da der primäre Browser des Users Safari ist, wäre die Pipette dort immer ausgeblendet. Funktion entfernt; Picker + Hex-Eingabe (mit Alpha) bleiben.

### Props-Erweiterung

```ts
interface ShopPreviewImageSectionProps {
  // … bestehende Props …
  logoBackgroundColor: string | null;
  onChangeLogoBackground: (value: string | null) => void;
  logoBackgroundLabel: string;
  logoBackgroundResetLabel: string;
}
```

### `ShopEditorFormContent` + `useShopEditorController`

- Form-State um `logoBackgroundColor: string | null`.
- `initialData`-Mapping in beiden Editor-Pfaden:
  - `apps/dashboard/src/features/overview/SubmissionEditorPage.tsx:33-58` (`toSubmissionFormData()`)
  - analoge Shop-Editor-Initialisierung
- Save-Payload überträgt das Feld als Teil des Update-Body.

### i18n

Keys in `apps/dashboard/src/i18n/messages.ts`:
- `shops.editor.logoBackground.label` (nur aria-label am Swatch, nicht visuell)
- `shops.editor.logoBackground.reset`

---

## Frontend Rendering

### `apps/frontend/src/components/ShopAvatar.astro`

Aktuell `bg-stone-50` hartkodiert (Line 21). Ersatz durch Prop + inline style:

```astro
---
import { resolveLogoBackground } from "@lmaa/shared";

interface Props {
  name: string;
  imageUrl?: string | null;
  logoBackgroundColor?: string | null;
  size?: "sm" | "md" | "lg";
}

const { name, imageUrl, logoBackgroundColor, size = "sm" } = Astro.props;
const bgColor = resolveLogoBackground(logoBackgroundColor);
---

<div
  class={`shrink-0 ${s.container} overflow-hidden border border-stone-100 flex items-center justify-center`}
  style={`background-color: ${bgColor}`}
>
```

`bg-stone-50` entfernt. Border-Class bleibt — soll auch bei dunklen Custom-Backgrounds sichtbar bleiben.

**Caller:** `apps/frontend/src/pages/shop/[token].astro:188`
```astro
<ShopAvatar
  name={shop.name}
  imageUrl={shop.ogImage}
  logoBackgroundColor={shop.logoBackgroundColor}
  size="md"
/>
```

### `apps/frontend/src/components/ShopCardReact.tsx`

Aktuell `bg-stone-50` in Logo-Wrapper (Line 77). Ersatz:

```tsx
<div
  className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-stone-100 flex items-center justify-center"
  style={{ backgroundColor: resolveLogoBackground(logoBackgroundColor) }}
>
```

Props-Erweiterung: `logoBackgroundColor?: string | null`.

### Caller-Files für ShopCardReact

Alle drei reichen `logoBackgroundColor={shop.logoBackgroundColor}` weiter:
- `apps/frontend/src/components/islands/LikedShopsGrid.tsx`
- `apps/frontend/src/components/islands/FilterableSearchResults.tsx`
- `apps/frontend/src/components/islands/FilterableCategoryShops.tsx`

Public-API liefert das Feld bereits aus den erweiterten Repo-Selects → keine zusätzliche API-Anpassung nötig.

---

## Error Handling

- **Invalid Hex am API-Edge:** Zod 400 mit klarer Message. Dashboard zeigt Inline-Fehler unter dem Hex-Input.
- **Frontend rendert immer einen Wert:** `resolveLogoBackground()` ist totale Funktion mit Default-Fallback.
- **Migration ist additiv:** nullable Column, kein Backfill, keine Datenmigration. Risikoarm.
- **Submission ohne Farbe approven:** `reviewSubmission` kopiert `null`, Shop bleibt auf Default — kein Bug.

---

## Testing

1. **`@lmaa/shared` Unit-Test** (neu) für `resolveLogoBackground()`:
   - `null` → `DEFAULT_LOGO_BACKGROUND`
   - `undefined` → `DEFAULT_LOGO_BACKGROUND`
   - `""` → `DEFAULT_LOGO_BACKGROUND`
   - `"#ff00aa"` → `"#ff00aa"`

2. **Backend Integration-Tests** (Erweiterung der bestehenden Suite, aktuell 470 grün):
   - `reviewSubmission(approve)` mit gesetzter `logoBackgroundColor` → neuer Shop trägt dieselbe Farbe.
   - Submission/Shop-Update mit invalidem Hex (`"#xyz"`, `"red"`, `"#fff"`) → 400.
   - Submission/Shop-Update mit `null` → DB-Wert auf null gesetzt.
   - Submission/Shop-Update ohne das Feld → keine Mutation (Field-Passthrough-Default).

3. **Dashboard:** kein dedizierter Test, manueller Smoke-Test (Color setzen, speichern, Reload, Wert noch da).

4. **Frontend:** kein automatisierter Test, visueller Smoke-Test:
   - Detail-Seite `/shop/<token>` mit Custom-Color vs. ohne.
   - Cards-Listings (Liked, Search, Category) mit Mix aus gesetzten und nicht gesetzten Farben.

---

## Open Questions

Keine. Alle Entscheidungen im Brainstorming geklärt:
- Farbwahl-UI: freier HTML5 Color-Picker.
- Default-Verhalten: nullable, Fallback bleibt `#fafaf9` (`stone-50`).
- Submission-Workflow: setzbar im Submission-Editor, beim Approve übernommen.
- Wirkungsbereich: Detail-Seite + Cards + Dashboard-Preview.

---

## Verified Facts

Alle Code-Refs grep/Read-verifiziert am 2026-05-13:

| Ref | Verified Via |
|-----|--------------|
| `apps/backend/src/db/schema.ts:63` `ogImage: text("og_image")` (shops) | Read |
| `apps/backend/src/db/schema.ts:258` `ogImage: text("og_image")` (submissions) | Read |
| `apps/backend/src/repositories/admin-submissions.ts:154-233` `reviewSubmission` mit `tx.insert(shops).values({…})` bei Line 219-233, `ogImage: submission.ogImage` bei Line 228 | Read |
| `apps/backend/src/repositories/admin-submissions.ts:267` Field-Passthrough-Pattern für `ogImage` | grep |
| `apps/backend/src/repositories/admin-shops.ts:68, 117` raw SQL SELECTs mit `s.og_image as "ogImage"` | grep |
| `apps/backend/src/repositories/public.ts:31, 177, 198, 243, 564` `ogImage` in Public-Reads | grep |
| `apps/backend/src/repositories/public-filtered.ts:217, 248, 292` `ogImage` in gefilterten Listings | grep |
| `apps/dashboard/src/features/content/shops/ShopPreviewImageSection.tsx` existiert, Thumbnail-Container Line 57, Image-Tag Line 59 | Read |
| `apps/dashboard/src/features/content/footer-builder/FooterStylePane.tsx:50` `type="color"` Color-Picker existiert | grep |
| `apps/dashboard/src/features/overview/SubmissionEditorPage.tsx:33` `toSubmissionFormData()` mappt Submission auf Form-State | Read |
| `apps/frontend/src/components/ShopAvatar.astro` `bg-stone-50` auf Line 21 | Read |
| `apps/frontend/src/components/ShopCardReact.tsx:77` `bg-stone-50` in Logo-Wrapper | grep |
| `apps/frontend/src/pages/shop/[token].astro:188` `<ShopAvatar ... />` Caller | grep |
| `apps/frontend/src/components/islands/{LikedShopsGrid,FilterableSearchResults,FilterableCategoryShops}.tsx` als ShopCardReact-Caller | grep |

**Plan-Checkliste-Vorgabe:** Plan-Write soll erneut alle Refs verifizieren, inklusive der exakten Namen für `shopUpdateSchema` / `submissionUpdateSchema` in `@lmaa/contracts` (noch nicht gegre'pt).
