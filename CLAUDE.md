# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**dein.shop** – A community-curated directory of Amazon alternatives for the German-speaking market.
Hosted at https://dein.shop, based on https://codeberg.org/phranck/Amazon-Alternativen.

## Repository & Hosting

- **Git Remote:** `git@github.com:phranck/dein.shop.git`
- **Hosting:** zerops.io (3 services: backend, frontend, dashboard)
- **Deployment config:** `zerops.yml` (root)

## Monorepo Structure

```
apps/
  backend/    @dein-shop/backend   – Hono + Bun + SQLite + Drizzle
  frontend/   @dein-shop/frontend  – React + Vite + Tailwind (public site)
  dashboard/  @dein-shop/dashboard – React + Vite + Tailwind (admin UI)
packages/
  shared/     @dein-shop/shared    – Shared TypeScript types (no runtime deps)
```

## Commands

```bash
# Install all workspaces
bun install

# Dev servers
bun run dev:frontend    # port 5173 (proxies /api → localhost:3000)
bun run dev:backend     # port 3000
bun run dev:dashboard   # port 5174 (proxies /api → localhost:3000)

# Type checking
bun run --filter=@dein-shop/shared typecheck
bun run --filter=@dein-shop/backend typecheck
bun run --filter=@dein-shop/frontend typecheck
bun run --filter=@dein-shop/dashboard typecheck

# Linting & formatting (Biome, not ESLint)
bun run lint
bun run lint:fix
bun run format

# Database
bun run db:migrate      # Run migrations + create FTS5 triggers
bun run db:generate     # Generate Drizzle migration files
bun run db:studio       # Drizzle Studio UI

# Build
bun run build:frontend
bun run build:backend
bun run build:dashboard
```

## Architecture

### Backend (`apps/backend`)
- **Runtime:** Bun, **Framework:** Hono
- **DB:** SQLite via `bun:sqlite` + Drizzle ORM
- **FTS:** SQLite FTS5 (triggers auto-sync from `shops` table)
- **Auth:** Server-side sessions (`HttpOnly` cookie), Argon2id via `Bun.password`
- **Email:** Resend (optional, graceful degradation if not configured)
- **Ports:** 3000 (prod), same local
- **Entry:** `apps/backend/src/index.ts`
- **Routes:** `src/routes/public.ts` (open) + `src/routes/admin.ts` (session required)
- **Admin onboarding:** `POST /api/admin/setup` – only works when no admin exists in DB

### Frontend (`apps/frontend`)
- React 19, React Router v7, TanStack Query v5
- **Search:** Fuse.js (client-side fuzzy search over all shops JSON)
- All shops fetched once via `GET /api/shops`, indexed by Fuse.js
- Tailwind v4 (via `@tailwindcss/vite` plugin), custom CSS vars in `src/index.css`
- Path alias `@/` → `src/`

### Dashboard (`apps/dashboard`)
- Separate Vite app, same stack as frontend minus Fuse.js
- Admin-only SPA with login, submission review, shop/category CRUD
- Connects to same backend via `/api/admin/*`
- Path alias `@/` → `src/`

### Shared (`packages/shared`)
- TypeScript types only: `Shop`, `Category`, `Submission`, `AdminUser`, `ApiResponse`
- Build required before frontend/dashboard: `bun run build --filter=@dein-shop/shared`

## Key Conventions

- **Linting:** Biome (no ESLint anywhere)
- **No Docker** – zerops.io handles deployment
- **SQLite path (prod):** `/mnt/sharedstorage/deinshop.db` (Zerops shared storage)
- **Environment variables:** Set in Zerops dashboard, not in files
  - Backend secrets: `RESEND_API_KEY`, `SESSION_SECRET`, `EMAIL_FROM`, `DATABASE_PATH`
  - Frontend build: `VITE_API_URL`
- **Soft-delete shops:** `is_active = false`, never hard-delete
- **Submission flow:** `pending → approved | rejected` (with optional email to submitter)
