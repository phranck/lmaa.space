# @lmaa/dashboard

Administrationsoberfläche für Moderation, Inhalte, Navigation und Analytics.

## Tech Stack

- React 19 + Vite
- TanStack Query
- Recharts
- geteilte Pakete: `@lmaa/shared`, `@lmaa/ui`

## Lokale Entwicklung

```bash
npm run dev -w @lmaa/dashboard
```

Läuft unter `http://localhost:5174`.

## Build

```bash
npm run build -w @lmaa/dashboard
```

Build-Ausgabe liegt in `apps/dashboard/dist`.

## Wichtige Module

- `src/features`: fachliche Module (Shops, Submissions, Analytics, Content)
- `src/components`: app-weite UI-Bausteine
- `src/lib`: API-Client, Services, Utilities
- `src/i18n`: Übersetzungen und Lokalisierung
