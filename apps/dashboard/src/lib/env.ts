/**
 * Strict env accessors for the dashboard app. No fallbacks — missing env is a
 * configuration error and triggers a clear runtime throw at module load.
 */

function requireEnv(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${key}. Define it in .env.local — manually or via pewee.`,
    );
  }
  return value;
}

export const FRONTEND_URL: string = requireEnv(
  "VITE_FRONTEND_URL",
  import.meta.env.VITE_FRONTEND_URL,
);
