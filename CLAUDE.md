# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**lmaa.space** – A community-curated directory of Amazon alternatives for the German-speaking market.
Hosted at https://lmaa.space, based on https://codeberg.org/phranck/Amazon-Alternativen.

## Repository & Hosting

- **Git Remote:** `git@github.com:phranck/lmaa.space.git`
- **Hosting:** zerops.io (3 services: backend, frontend, dashboard)
- **Deployment config:** `zerops.yml` (root)

## Monorepo Structure

```
apps/
  backend/    @lmaa/backend   – Hono + Node.js + PostgreSQL + Drizzle
  frontend/   @lmaa/frontend  – React + Vite + Tailwind (public site)
  dashboard/  @lmaa/dashboard – React + Vite + Tailwind (admin UI)
packages/
  shared/     @lmaa/shared    – Shared TypeScript types (no runtime deps)
```

## Commands

```bash
# Install all workspaces
npm install

# Dev servers
npm run dev:frontend    # port 5173 (proxies /api → localhost:3000)
npm run dev:backend     # port 3000
npm run dev:dashboard   # port 5174 (proxies /api → localhost:3000)

# Type checking
npm run typecheck -w @lmaa/shared
npm run typecheck -w @lmaa/backend
npm run typecheck -w @lmaa/frontend
npm run typecheck -w @lmaa/dashboard

# Linting & formatting (Biome, not ESLint)
npm run lint
npm run lint:fix
npm run format

# Database
npm run db:migrate      # Run migrations + create tsvector trigger
npm run db:generate     # Generate Drizzle migration files
npm run db:studio       # Drizzle Studio UI

# Build
npm run build:frontend
npm run build:backend
npm run build:dashboard
```

## Architecture

### Backend (`apps/backend`)
- **Runtime:** Node.js 22, **Framework:** Hono
- **DB:** PostgreSQL via `postgres` (postgres.js) + Drizzle ORM
- **FTS:** PostgreSQL `tsvector` + GIN index + `BEFORE INSERT OR UPDATE` trigger
- **Auth:** Server-side sessions (`HttpOnly` cookie), bcryptjs
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
- Build required before frontend/dashboard: `npm run build -w @lmaa/shared`

## Key Conventions

- **Linting:** Biome (no ESLint anywhere)
- **No Docker** – zerops.io handles deployment
- **Environment variables:** Set in Zerops dashboard, not in files
  - Backend: `DATABASE_URL` = `${postgres_connectionString}` (Zerops PG-Service "postgres"), `RESEND_API_KEY`, `SESSION_SECRET`, `EMAIL_FROM`
  - Frontend build: `VITE_API_URL`
- **Soft-delete shops:** `is_active = false`, never hard-delete
- **Submission flow:** `pending → approved | rejected` (with optional email to submitter)
