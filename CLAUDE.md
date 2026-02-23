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

## Pre-Commit Checklist

Before every commit, run linter, typecheck, and build in this order:

```bash
npm run lint
npm run typecheck -w @lmaa/shared
npm run typecheck -w @lmaa/backend
npm run typecheck -w @lmaa/frontend
npm run typecheck -w @lmaa/dashboard
npm run build:frontend
npm run build:backend
npm run build:dashboard
```

All errors and warnings must be resolved before committing. Do not commit with a clean-up intention — fix issues first, then commit.

## Key Conventions

- **Linting:** Biome (no ESLint anywhere)
- **No Docker** – zerops.io handles deployment
- **Environment variables:** Set in Zerops dashboard, not in files
  - Backend: `DATABASE_URL` = `${postgres_connectionString}` (Zerops PG-Service "postgres"), `RESEND_API_KEY`, `SESSION_SECRET`, `EMAIL_FROM`
  - Frontend build: `VITE_API_URL`
- **Soft-delete shops:** `is_active = false`, never hard-delete
- **Submission flow:** `pending → approved | rejected` (with optional email to submitter)

## Architecture & Coding Rules

These rules are derived from a deep code analysis (2026-02-23) and apply to all future work.

### Dashboard: Strict UI/Logic Separation

**Mandatory:** All TanStack Query hooks (useQuery, useMutation) live exclusively in `features/*/hooks/` files. Page and sub-view components consume hooks only — they never import `api` or call `useQuery`/`useMutation` directly.

```
features/
  categories/
    hooks/useAdminCategories.ts   ← query + mutations
    CategoriesPage.tsx             ← only imports from hooks/
```

- Form data types (e.g. `ShopFormData`) are defined in the hook file and exported for use in pages.
- Query cache invalidation (`queryClient.invalidateQueries`) belongs in the hook's `onSuccess`, not in the page.
- Per-call UI resets (e.g. `setDeleteId(null)`) are passed as per-call `onSuccess` to `mutate()`.

### DRY: Shared UI Components

Extract repeated patterns into shared components rather than duplicating them:

- **Delete confirmation modal** — occurs 4× in the dashboard. Use a shared `<ConfirmDialog>` component from `components/ui/`.
- **Loading skeletons** — the `Array.from({ length: N }).map(...)` animate-pulse pattern occurs 6× across both apps. Create a `<SkeletonList count height />` component.

### Query Keys as Constants

Query keys must not be magic strings scattered across files. Define and export them from the respective hook file:

```ts
// in hooks/useAdminShops.ts
export const shopsQueryKey = ["shops-admin"] as const;
```

Both the query and all related `invalidateQueries` calls reference the same constant.

### Backend: No Business Logic in Route Handlers

Route handlers in `admin.ts` / `public.ts` must stay thin. Business logic (multi-step operations, shop creation on submission approval, OG-image fetching) belongs in a service layer under `src/services/`.

### Backend: Split admin.ts by Domain

`admin.ts` (25+ endpoints, 546 lines) must be split into domain-specific router files:

```
src/routes/admin/
  shops.ts
  categories.ts
  submissions.ts
  users.ts
  stats.ts
  unsplash.ts
```

Import and mount all of them in a thin `src/routes/admin/index.ts`.

### Backend: Database Transactions for Multi-Step Writes

Any operation that performs more than one DB mutation must use a Drizzle transaction (`db.transaction(async (tx) => { ... })`). In particular:

- Submission approval (update submission + insert shop)
- User deletion (delete sessions + delete user)
- Shop deletion from dead-link-reports (delete reports + soft-delete shop)

### Backend: Consistent Cookie Handling

Always use Hono's `getCookie()` / `setCookie()` API. Never parse the `Cookie` header manually via regex. The `secure` flag must use the same expression everywhere: `process.env.NODE_ENV === "production"`.

### Backend: URL Parameter Validation

After `Number(c.req.param("id"))`, always validate with `isNaN()` before using the value. Return 400 if NaN.

```ts
const id = Number(c.req.param("id"));
if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);
```

### Security: XSS in Email Templates

All user-supplied strings (shop names, rejection reasons) injected into HTML email bodies must be HTML-escaped before insertion. Never interpolate raw user input into HTML strings.

### Security: SSRF via Unsplash Proxy

The `downloadLocation` URL received from the client must be validated against an allowlist (e.g. must start with `https://api.unsplash.com/`) before being passed to `fetch()`.

### Security: Image Upload – Content Validation

The image upload endpoint must inspect the actual file content (magic bytes / file signature), not rely solely on the client-provided MIME type. Reject files that do not match an expected image signature.

### Single Source of Truth for Types

The project has three type sources that can drift: Drizzle-inferred types, backend Zod schemas, and `@lmaa/shared` interfaces. Long-term goal: Zod schemas move to `@lmaa/shared`; interfaces are derived via `z.infer<>`. Until then, when changing a shared type, update all three locations in the same commit.

Interfaces that are missing from `@lmaa/shared` but should be there:
- `Stats` (currently only in `DashboardPage.tsx`)
- `DeadLinkReport` (currently only in `SubmissionsPage.tsx`)
- `SubmissionStatus` (redefined in dashboard and shared – remove duplicate)

### Frontend: No Hover Effects via JavaScript

Do not use `onMouseEnter`/`onMouseLeave` to change `style.*` for hover styling. Use Tailwind hover classes or CSS classes with `:hover` pseudo-classes instead.

### Frontend: Error Boundaries

Every app must have at least one top-level React Error Boundary to prevent a component error from crashing the entire app.

### Frontend: Active-only Data in Public Routes

The public `GET /api/categories/:slug` endpoint must filter shops by `is_active = true`, consistent with `GET /api/shops`. Inactive shops must never appear on the public site.
