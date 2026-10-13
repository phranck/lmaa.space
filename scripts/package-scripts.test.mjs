import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const repositoryRoot = new URL("../", import.meta.url);

// npm decides on every install whether a dependency lands in a workspace's own
// node_modules or is hoisted to the root, and a version bump anywhere in the
// tree can flip that decision. A script naming either location breaks on the
// next flip. `npm run` already puts the node_modules/.bin of the workspace and
// of every directory above it on PATH, so a script finds a binary by its name,
// or by `$(command -v <name>)` where node has to be the one starting it.
const INSTALL_LOCATION_PATTERN = /node_modules\//;

/**
 * Reads and parses the package.json in a directory.
 *
 * @param {URL} directory Directory URL ending in a slash.
 * @returns {Promise<{ name?: string, workspaces?: string[], scripts?: Record<string, string> }>}
 *   The parsed manifest.
 */
async function readManifest(directory) {
  return JSON.parse(await readFile(new URL("package.json", directory), "utf8"));
}

/**
 * Lists the directory of every workspace the root package.json declares.
 *
 * Only patterns of the form `<directory>/*` are expanded, which is the only
 * form the root manifest uses. Any other form fails the test rather than being
 * skipped, so a new pattern cannot quietly exempt its workspaces.
 *
 * @returns {Promise<URL[]>} One directory URL per workspace, each ending in a slash.
 */
async function workspaceDirectories() {
  const { workspaces = [] } = await readManifest(repositoryRoot);
  const directories = [];
  for (const pattern of workspaces) {
    assert.match(pattern, /^[^*]+\/\*$/, `workspace pattern "${pattern}" is not "<dir>/*"`);
    const parent = new URL(pattern.slice(0, -1), repositoryRoot);
    for (const entry of await readdir(parent, { withFileTypes: true })) {
      if (entry.isDirectory()) directories.push(new URL(`${entry.name}/`, parent));
    }
  }
  return directories;
}

test("no package script names an install location inside node_modules", async () => {
  const directories = [repositoryRoot, ...(await workspaceDirectories())];
  const offenders = [];
  for (const directory of directories) {
    const { name = "(root)", scripts = {} } = await readManifest(directory);
    for (const [scriptName, command] of Object.entries(scripts)) {
      if (INSTALL_LOCATION_PATTERN.test(command))
        offenders.push(`${name} ${scriptName}: ${command}`);
    }
  }
  assert.deepEqual(offenders, []);
});
