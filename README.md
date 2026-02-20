# dein.shop

<!-- BADGES:START -->
![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.x-FBF0DF?style=flat-square&logo=bun&logoColor=black)
![Hono](https://img.shields.io/badge/Hono-4.7.4-E36002?style=flat-square&logo=hono&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)
<!-- BADGES:END -->

![GitHub last commit](https://img.shields.io/github/last-commit/phranck/dein.shop?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/phranck/dein.shop?style=flat-square)
[![Hosted on Zerops](https://img.shields.io/badge/Hosted%20on-Zerops-5C6BC0?style=flat-square)](https://zerops.io)

---

Eine Community-kuratierte Liste von Online-Shops als Alternativen zu Amazon – für den deutschsprachigen Raum.

**Live:** [https://dein.shop](https://dein.shop) · **Ursprungsprojekt:** [Codeberg](https://codeberg.org/phranck/Amazon-Alternativen)

## Monorepo-Struktur

```
apps/
  backend/    @dein-shop/backend   – Hono + Bun + SQLite + Drizzle
  frontend/   @dein-shop/frontend  – React + Vite + Tailwind (öffentliche Seite)
  dashboard/  @dein-shop/dashboard – React + Vite + Tailwind (Admin)
packages/
  shared/     @dein-shop/shared    – Geteilte TypeScript-Types
```

## Entwicklung

```bash
# Abhängigkeiten installieren
bun install

# Dev-Server starten
bun run dev:backend    # Port 3000
bun run dev:frontend   # Port 5173
bun run dev:dashboard  # Port 5174
```

## Mitmachen

Kein GitHub-Account nötig! Einfach auf [dein.shop/vorschlagen](https://dein.shop/vorschlagen) einen Shop vorschlagen.

## Unterstützen

dein.shop ist ein privates Community-Projekt ohne kommerzielle Interessen.

[![PayPal](https://img.shields.io/badge/PayPal-Spenden-0070BA?style=flat-square&logo=paypal&logoColor=white)](https://paypal.me/phranck)
[![Ko-Fi](https://img.shields.io/badge/Ko--Fi-Spenden-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/phranck)
