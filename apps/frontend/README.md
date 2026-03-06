# @lmaa/frontend

Öffentliche Website auf Basis von Astro SSR mit React-Islands.

## Tech Stack

- Astro 5 (`@astrojs/node`, `@astrojs/react`)
- UnoCSS
- geteilte Pakete: `@lmaa/shared`, `@lmaa/ui`

## Lokale Entwicklung

```bash
npm run dev -w @lmaa/frontend
```

Standardmäßig unter `http://localhost:5173`.

## Build

```bash
npm run build -w @lmaa/frontend
```

SSR-Ausgabe liegt in `apps/frontend/dist`.

## Wichtige Module

- `src/pages`: öffentliche Routen
- `src/components/islands`: React-Komponenten mit Client-Hydration
- `src/lib`: API-Clients, Domain-Helfer und Shared-Adapter
- `src/middleware.ts`: schlanker Proxy für `/sitemap.xml` zum Backend
