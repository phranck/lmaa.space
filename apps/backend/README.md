# @lmaa/backend

Hono-API für öffentliche Shop-Daten, Admin-Funktionen, Formulare, E-Mail-Versand, Social-Media-Integrationen und operative Jobs.

## Tech Stack

- Hono auf Node.js 22
- PostgreSQL mit Drizzle ORM
- Zod für Runtime-Validierung
- Vitest für Service-, Repository- und Routentests
- tsup für das Produktions-Bundle

## Lokale Entwicklung

```bash
npm run dev -w @lmaa/backend
```

Der Dev-Server lädt `apps/backend/.env.local` und läuft über `src/index.ts`.

## Environment

Minimal für lokale Entwicklung:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://...
DASHBOARD_URL=http://localhost:5174
FRONTEND_URL=http://localhost:5173
```

Wichtige produktive Variablen:

- `DATABASE_URL`: Runtime-Verbindung zur PostgreSQL-Datenbank.
- `DATABASE_URL_MIGRATOR`: optionale Migrations-Verbindung, fällt auf `DATABASE_URL` zurück.
- `IP_HASH_SALT`: in Production Pflicht, mindestens 16 Zeichen, für serverseitige Besucher-Hashes.
- `TRUST_PROXY_IP_HEADER`: in Production fest auf `cf-connecting-ip` validiert.
- `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`: E-Mail-Versand und Benachrichtigungen.
- `DASHBOARD_URL`, `FRONTEND_URL`: externe URLs, in Non-Production Pflicht.
- `UMAMI_URL`, `UMAMI_USERNAME`, `UMAMI_PASSWORD`, `UMAMI_WEBSITE_ID`: optionale Analytics-Anbindung.
- `UNSPLASH_ACCESS_KEY`: optionale Medien-/Bildsuche.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: optionale Push-Benachrichtigungen.
- `RUN_MIGRATIONS_ON_STARTUP`: `true` oder `false`, Default `true`.

Weitere optionale Runtime-Variablen sind in `src/config/env.ts` definiert und werden beim Start validiert.

## Datenbank

```bash
npm run db:doctor -w @lmaa/backend
npm run db:migrate -w @lmaa/backend
npm run db:generate
```

- `db:doctor` prüft die Datenbankverbindung und grundlegende Voraussetzungen.
- `db:migrate` führt die Drizzle-Migrationen aus.
- `db:generate` erzeugt neue Migrationen aus dem aktuellen Schema.

## Tests und Qualität

```bash
npm test -w @lmaa/backend
npm run typecheck -w @lmaa/backend
npm run build -w @lmaa/backend
```

Der repo-weite Gate ist:

```bash
npm run ci:quality
```

## Betriebshinweise

- Der Public-Shop-Cache in `src/middleware/cache.ts` ist process-lokal und kurzlebig. Er ist für Single-Instance-Deployments oder kurze Stale-Windows gedacht.
- Admin-Mutationen invalidieren nur den Cache der aktuellen Backend-Instanz. Bei dauerhaftem Multi-Instance-Betrieb braucht der Cache Redis oder eine vergleichbare shared invalidation strategy.
- Die Rate-Limit-Buckets sind dagegen datenbankgestützt und bereits für mehrere Backend-Instanzen ausgelegt.
- Die API-Referenz wird von [periwinkle](https://github.com/phranck/periwinkle) als statische Seite erzeugt und unter `/docs` ausgeliefert; `/` leitet dorthin weiter. Das OpenAPI-JSON bleibt unter `/openapi.json`.
- Die Doku ist reine Dokumentation, es gibt kein Try-it-out mehr.
- Gebaut wird sie mit `npm run docs:build -w @lmaa/backend` nach `apps/backend/docs-dist/` (gitignored, im Deploy vom Build-Command erzeugt). Ohne diesen Build antwortet `/docs` lokal mit einem Hinweis statt einer leeren 404.

## Wichtige Module

- `src/index.ts`: Server-Boot, globale Middleware, Routen, OpenAPI/Doku, Background-Jobs und Shutdown.
- `src/routes`: öffentliche und Admin-HTTP-Routen.
- `src/services`: fachliche Use-Cases und Integrationslogik.
- `src/repositories`: Datenbankzugriff.
- `src/db/schema.ts`: Drizzle-Schema.
- `src/db/migrate.ts`: produktiver Migrationseintrittspunkt.
- `src/config/env.ts`: vollständiger Runtime-Vertrag.
