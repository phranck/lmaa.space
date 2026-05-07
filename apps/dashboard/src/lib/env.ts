/**
 * Strict env accessors for the dashboard app.
 *
 * Production builds fall back to canonical URLs; non-production builds throw
 * a clear configuration error if the variable is missing from `.env.local`.
 */

function resolveFrontendUrl(): string {
  const explicit = import.meta.env.VITE_FRONTEND_URL;
  if (explicit) return explicit;
  if (import.meta.env.PROD) return "https://lmaa.space";
  throw new Error(
    "Missing VITE_FRONTEND_URL. Define it in .env.local — manually or via pewee.",
  );
}

export const FRONTEND_URL: string = resolveFrontendUrl();
