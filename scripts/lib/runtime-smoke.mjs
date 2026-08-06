/**
 * Shared pieces for starting a built artefact and deciding whether it loaded.
 *
 * Two checks use this. `smoke-backend-bundle.mjs` runs the backend entrypoints
 * against the working tree, which catches faults introduced by bundling.
 * `verify-deploy-artifacts.mjs` runs them against only the files `zerops.yml`
 * deploys, which catches modules that exist locally but never reach the target.
 */
import { spawn } from "node:child_process";

/**
 * Failures that mean the artefact is broken rather than the environment being
 * absent. All are raised while modules are still being evaluated, before any
 * application code decides anything.
 */
export const LOAD_ERROR_PATTERNS = [
  /ERR_INVALID_ARG_VALUE/,
  /ERR_MODULE_NOT_FOUND/,
  /ERR_REQUIRE_ESM/,
  /ERR_PACKAGE_PATH_NOT_EXPORTED/,
  /ERR_UNSUPPORTED_DIR_IMPORT/,
  /ERR_DLOPEN_FAILED/,
  /Cannot find module/,
  /Cannot find package/,
  /\bReferenceError\b/,
  /\bSyntaxError\b/,
];

/**
 * Environment that satisfies validation without pointing at anything real.
 *
 * @remarks
 * Every value has to be one the schemas accept. An invalid value throws during
 * validation, which happens before the modules under test are reached and would
 * let a broken artefact pass unnoticed. That is not hypothetical: an earlier
 * draft used `LOG_LEVEL=silent`, which the backend schema rejects, and the
 * check went green against an artefact that could not start.
 */
export const SMOKE_ENV = {
  NODE_ENV: "development",
  DATABASE_URL: "postgres://smoke:smoke@127.0.0.1:1/smoke",
  DATABASE_URL_MIGRATOR: "postgres://smoke:smoke@127.0.0.1:1/smoke",
  IP_HASH_SALT: "ci-smoke-salt-not-a-secret",
  DASHBOARD_URL: "https://dashboard.invalid",
  FRONTEND_URL: "https://frontend.invalid",
  API_URL: "http://127.0.0.1:1/api/v1",
  BACKEND_URL: "http://127.0.0.1:1/api/v1",
  PUBLIC_API_URL: "/api/v1",
  RUN_MIGRATIONS_ON_STARTUP: "false",
  HOST: "127.0.0.1",
  PORT: "45999",
  LOG_LEVEL: "error",
};

/**
 * Starts one entrypoint and reports whether it got past module evaluation.
 *
 * @param entry - Path to the built file, relative to `cwd`.
 * @param options.cwd - Directory to start it from. Decides which `node_modules` it sees.
 * @param options.graceMs - How long it may run before it counts as loaded.
 * @param options.env - Extra environment on top of {@link SMOKE_ENV}.
 * @param options.nodeArgs - Flags for the node process itself, before the entrypoint.
 * @returns Outcome for this entrypoint.
 *
 * @remarks
 * A process still running after the grace period counts as loaded, which is the
 * normal outcome for anything that starts a server. An exit only fails the
 * check when the output matches {@link LOAD_ERROR_PATTERNS}, so the missing
 * database these checks deliberately point at does not cause a false alarm.
 */
export function runEntrypoint(
  entry,
  { cwd = process.cwd(), graceMs = 8000, env = {}, nodeArgs = [] } = {},
) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...nodeArgs, entry], {
      cwd,
      env: { ...process.env, ...SMOKE_ENV, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const collect = (chunk) => {
      output += chunk;
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ entry, ok: true, detail: "still running after the grace period" });
    }, graceMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ entry, ok: false, detail: `could not be started: ${err.message}` });
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (signal === "SIGKILL") return;

      if (LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(output))) {
        const firstLines = output.trim().split("\n").slice(0, 4).join("\n    ");
        resolve({ entry, ok: false, detail: `failed while loading modules:\n    ${firstLines}` });
        return;
      }
      resolve({ entry, ok: true, detail: `exited with ${code} and no load error` });
    });
  });
}

/**
 * Prints results and returns whether all of them loaded.
 *
 * @param results - Outcomes from {@link runEntrypoint}.
 * @returns `true` when every entrypoint loaded.
 */
export function reportResults(results) {
  for (const result of results) {
    console.log(`${result.ok ? "ok  " : "FAIL"} ${result.entry} — ${result.detail}`);
  }
  return results.every((result) => result.ok);
}
