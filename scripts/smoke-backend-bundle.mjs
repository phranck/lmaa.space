#!/usr/bin/env node
/**
 * Loads every built backend entrypoint and fails when one cannot be evaluated.
 *
 * The test suite runs against the TypeScript sources and never touches `dist/`,
 * so a fault introduced by bundling passes every other gate. That is not
 * hypothetical: sharp 0.35.3 stopped matching the `external` entry in
 * `apps/backend/tsup.config.ts`, its ESM entry was inlined into the CommonJS
 * bundle, and the `createRequire(import.meta.url)` it runs at module scope
 * became `createRequire(undefined)` because esbuild cannot represent
 * `import.meta` in CommonJS. Every gate stayed green and the deployed process
 * died on startup.
 *
 * This runs against the working tree, where `node_modules` is complete, so it
 * isolates bundling faults from packaging ones. Whether the deployed subset is
 * also sufficient is what `verify-deploy-artifacts.mjs` answers.
 */
import { existsSync } from "node:fs";

import { reportResults, runEntrypoint } from "./lib/runtime-smoke.mjs";

/** Built entrypoints, matching the `entry` list in `apps/backend/tsup.config.ts`. */
const ENTRYPOINTS = [
  "apps/backend/dist/index.js",
  "apps/backend/dist/db/doctor.js",
  "apps/backend/dist/db/migrate.js",
];

const missing = ENTRYPOINTS.filter((entry) => !existsSync(entry));
if (missing.length > 0) {
  console.error(`Backend bundle smoke check failed: missing ${missing.join(", ")}`);
  process.exit(1);
}

const results = [];
for (const entry of ENTRYPOINTS) {
  results.push(await runEntrypoint(entry));
}

if (!reportResults(results)) {
  console.error("\nBackend bundle smoke check failed: an entrypoint could not be loaded.");
  process.exit(1);
}

console.log(`\nLoaded ${results.length} backend entrypoints from the built bundle.`);
