# lmaa.space

<!-- BADGES:START -->

![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat&logo=typescript&logoColor=white)
![npm](https://img.shields.io/badge/npm-11.x-CB3837?style=flat&logo=npm&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-4.7.4-E36002?style=flat&logo=hono&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat&logo=tailwindcss&logoColor=white)

<!-- BADGES:END -->

![GitHub issues](https://img.shields.io/github/issues/phranck/lmaa.space?style=flat)

---

Eine community-kuratierte Liste von Online-Shops als Alternativen zu Amazon für den deutschsprachigen Raum.

**Live:** [https://lmaa.space](https://lmaa.space) · **Ursprungsprojekt:** [Codeberg](https://codeberg.org/phranck/Amazon-Alternativen)

## Monorepo-Struktur

```
apps/
  backend/    @lmaa/backend   – Hono + Node.js + PostgreSQL + Drizzle
  frontend/   @lmaa/frontend  – Astro SSR + React Islands (öffentliche Seite)
  dashboard/  @lmaa/dashboard – React + Vite (Admin)
packages/
  shared/     @lmaa/shared    – geteilte Domain-Typen, Konstanten, Utilities
  contracts/  @lmaa/contracts – geteilte Zod-Verträge für API-Payloads
  ui/         @lmaa/ui        – geteilte UI-Komponenten
```

## Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Dev-Server starten
npm run dev:backend    # Port 3000
npm run dev:frontend   # Port 5173
npm run dev:dashboard  # Port 5174
```

## Qualität & Dokumentation

```bash
# Lint + Typprüfung + Build + Smoke
npm run ci:quality

# API-/Code-Referenz aus TypeScript-Exports generieren
npm run docs:code
```

- Doku-Standard: `docs/CODE-DOCUMENTATION.md`
- Code-Referenz-Output: `docs/reference/code`

## Mitmachen

Kein GitHub-Account nötig! Einfach auf [lmaa.space/vorschlagen](https://lmaa.space/vorschlagen) einen Shop vorschlagen.

## Unterstützen

lmaa.space ist ein privates Community-Projekt ohne kommerzielle Interessen.

[![PayPal](https://img.shields.io/badge/PayPal-Spenden-0070BA?style=flat&logo=paypal&logoColor=white)](https://paypal.me/phranck)
[![Ko-Fi](https://img.shields.io/badge/Ko--Fi-Spenden-FF5E5B?style=flat&logo=ko-fi&logoColor=white)](https://ko-fi.com/layeredwork)
