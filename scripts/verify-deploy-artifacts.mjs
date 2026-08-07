#!/usr/bin/env node
/**
 * Starts each service's runtime entrypoint against only the files `zerops.yml`
 * deploys, rather than against the working tree.
 *
 * The bundle smoke check runs from the repository, where `node_modules` holds
 * everything. On the target only what `deployFiles` lists is present, and
 * nothing compared the two. Three outages on 2026-08-06 came from exactly that
 * gap: sharp reached the target without `detect-libc` and `semver`, and the
 * website reached it without astro and `es-module-lexer`, because npm keeps
 * those in the workspace directory rather than hoisting them. Every gate stayed
 * green because every gate ran locally.
 *
 * The staging tree is built from symlinks, so a listed directory costs nothing
 * to include while an unlisted one is genuinely absent, which is the property
 * being tested.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { reportResults, runEntrypoint } from "./lib/runtime-smoke.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Reads the deploy configuration for services started with node.
 *
 * @returns One entry per service, with the files it deploys and the file it starts.
 *
 * @remarks
 * The dashboard is skipped: it is served by nginx from static files and has no
 * runtime entrypoint that could fail to resolve a module.
 */
function readNodeServices() {
  const config = parse(readFileSync(path.join(repoRoot, "zerops.yml"), "utf8"));
  const services = [];

  for (const service of config.zerops ?? []) {
    const start = service.run?.start;
    const deployFiles = service.build?.deployFiles;
    if (typeof start !== "string" || !start.startsWith("node ") || !Array.isArray(deployFiles)) {
      continue;
    }
    services.push({ name: service.setup, deployFiles, entry: start.slice("node ".length).trim() });
  }

  return services;
}

/**
 * Links one deployed path into the staging tree, creating parents as needed.
 *
 * @param stagingDir - Root of the staging tree.
 * @param relativePath - Path as written in `deployFiles`.
 * @returns `true` when the path existed and was linked.
 */
function stagePath(stagingDir, relativePath) {
  const source = path.join(repoRoot, relativePath);
  if (!existsSync(source)) return false;

  const target = path.join(stagingDir, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  symlinkSync(source, target);
  return true;
}

/**
 * Builds a tree containing exactly the deployed files and starts the entrypoint from it.
 *
 * @param service - Service description from {@link readNodeServices}.
 * @returns Outcome for the service's entrypoint.
 */
async function verifyService(service) {
  const stagingDir = await mkdtemp(path.join(tmpdir(), `deploy-${service.name}-`));

  try {
    // A path may be absent here and still be deployed, because each service's
    // `buildCommands` run on the target and produce more than `npm run build`
    // does locally. `apps/backend/docs-dist` is one of those. Zerops refuses a
    // deploy whose `deployFiles` names something missing, so that case is
    // already covered there; what this check adds is whether the entrypoint can
    // resolve its modules, which is worth answering even from a partial tree.
    const missing = service.deployFiles.filter((entry) => !stagePath(stagingDir, entry));
    const missingNote =
      missing.length > 0 ? ` (not built locally: ${missing.join(", ")})` : "";

    if (!existsSync(path.join(stagingDir, service.entry))) {
      return {
        entry: `${service.name}: ${service.entry}`,
        ok: false,
        detail: "the start command's file is not among the deployed files",
      };
    }

    // Without these flags node resolves each symlink to its real location in the
    // repository and then searches upwards from there, which finds every module
    // the working tree has and defeats the point of the staging tree. Keeping
    // resolution on the symlinked paths confines it to what was staged.
    const result = await runEntrypoint(service.entry, {
      cwd: stagingDir,
      nodeArgs: ["--preserve-symlinks", "--preserve-symlinks-main"],
    });
    return {
      ...result,
      entry: `${service.name}: ${service.entry}`,
      detail: `${result.detail}${missingNote}`,
    };
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

const services = readNodeServices();
if (services.length === 0) {
  console.error("No node services found in zerops.yml; nothing to verify.");
  process.exit(1);
}

// Runs as part of `ci:smoke`, after the build, so the artefacts are expected to
// be there already. Building here would repeat several minutes of work.
const results = [];
for (const service of services) {
  results.push(await verifyService(service));
}

if (!reportResults(results)) {
  console.error(
    "\nDeploy artefact check failed: a service could not start from the files zerops.yml deploys.",
  );
  process.exit(1);
}

console.log(`\nStarted ${results.length} services from their deployed files only.`);
