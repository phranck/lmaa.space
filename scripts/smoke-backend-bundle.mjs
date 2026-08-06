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
 * Each entrypoint is started in its own process. A missing database is expected
 * here and must not fail the check, so the two outcomes are told apart by what
 * the process writes: a bundling fault reports one of {@link LOAD_ERROR_PATTERNS}
 * whilst modules are still being evaluated, whereas an absent database surfaces
 * later as an ordinary connection error.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

/** Built entrypoints, matching the `entry` list in `apps/backend/tsup.config.ts`. */
const ENTRYPOINTS = [
  "apps/backend/dist/index.js",
  "apps/backend/dist/db/doctor.js",
  "apps/backend/dist/db/migrate.js",
];

/**
 * How long a process may run before it counts as loaded. `index.js` starts an
 * HTTP server and keeps running, so reaching this point without an error is the
 * success case for it.
 */
const STARTUP_GRACE_MS = 8000;

/**
 * Failures that mean the bundle is broken rather than the environment missing.
 * All of these are raised whilst modules are being evaluated, before any
 * application code decides anything.
 */
const LOAD_ERROR_PATTERNS = [
  /ERR_INVALID_ARG_VALUE/,
  /ERR_MODULE_NOT_FOUND/,
  /ERR_REQUIRE_ESM/,
  /ERR_PACKAGE_PATH_NOT_EXPORTED/,
  /ERR_UNSUPPORTED_DIR_IMPORT/,
  /Cannot find module/,
  /\bReferenceError\b/,
  /\bSyntaxError\b/,
];

/**
 * Environment that satisfies validation without pointing at anything real. The
 * port is unusual so a developer's running backend is not disturbed, and
 * migrations stay off because this check is about loading, not about schema.
 */
const SMOKE_ENV = {
  NODE_ENV: "development",
  DATABASE_URL: "postgres://smoke:smoke@127.0.0.1:1/smoke",
  DATABASE_URL_MIGRATOR: "postgres://smoke:smoke@127.0.0.1:1/smoke",
  IP_HASH_SALT: "ci-smoke-salt-not-a-secret",
  DASHBOARD_URL: "https://dashboard.invalid",
  FRONTEND_URL: "https://frontend.invalid",
  RUN_MIGRATIONS_ON_STARTUP: "false",
  HOST: "127.0.0.1",
  PORT: "45999",
  // Must be one of the levels the env schema accepts. An invalid value throws
  // during validation, which happens before the modules under test are reached
  // and would let a broken bundle pass unnoticed.
  LOG_LEVEL: "error",
};

/**
 * Runs one entrypoint and reports whether it got past module evaluation.
 *
 * @param {string} entry - Path to the built file.
 * @returns {Promise<{ entry: string, ok: boolean, detail: string }>} Outcome for this entrypoint.
 */
function loadEntrypoint(entry) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [entry], {
      env: { ...process.env, ...SMOKE_ENV },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdout.resume();

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ entry, ok: true, detail: "still running after the grace period" });
    }, STARTUP_GRACE_MS);

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ entry, ok: false, detail: `could not be started: ${err.message}` });
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (signal === "SIGKILL") return;

      const loadError = LOAD_ERROR_PATTERNS.find((pattern) => pattern.test(stderr));
      if (loadError) {
        const firstLines = stderr.trim().split("\n").slice(0, 4).join("\n    ");
        resolve({ entry, ok: false, detail: `failed while loading modules:\n    ${firstLines}` });
        return;
      }
      resolve({ entry, ok: true, detail: `exited with ${code} and no load error` });
    });
  });
}

const missing = ENTRYPOINTS.filter((entry) => !existsSync(entry));
if (missing.length > 0) {
  console.error(`Backend bundle smoke check failed: missing ${missing.join(", ")}`);
  process.exit(1);
}

const results = [];
for (const entry of ENTRYPOINTS) {
  results.push(await loadEntrypoint(entry));
}

for (const result of results) {
  console.log(`${result.ok ? "ok  " : "FAIL"} ${result.entry} — ${result.detail}`);
}

if (results.some((result) => !result.ok)) {
  console.error("\nBackend bundle smoke check failed: an entrypoint could not be loaded.");
  process.exit(1);
}

console.log(`\nLoaded ${results.length} backend entrypoints from the built bundle.`);
