import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { runEntrypoint } from "./runtime-smoke.mjs";

let fixtureDir;

before(async () => {
  fixtureDir = await mkdtemp(path.join(tmpdir(), "runtime-smoke-"));
  // A start-up failure that matches none of the load error patterns: a
  // TypeError thrown before the server listens.
  await writeFile(
    path.join(fixtureDir, "crashes.mjs"),
    "const app = {};\napp.pipeline.getLogger();\n",
  );
  await writeFile(path.join(fixtureDir, "serves.mjs"), "setInterval(() => {}, 1000);\n");
  await writeFile(path.join(fixtureDir, "exits.mjs"), "process.exit(1);\n");
});

after(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

test("a start command that crashes during start-up fails", async () => {
  const result = await runEntrypoint("crashes.mjs", {
    cwd: fixtureDir,
    graceMs: 3000,
    mustKeepRunning: true,
  });

  assert.equal(result.ok, false);
  assert.match(result.detail, /TypeError/);
});

test("a start command that keeps running passes", async () => {
  const result = await runEntrypoint("serves.mjs", {
    cwd: fixtureDir,
    graceMs: 500,
    mustKeepRunning: true,
  });

  assert.equal(result.ok, true);
});

test("a one-shot script may exit when its output names no load error", async () => {
  const result = await runEntrypoint("exits.mjs", { cwd: fixtureDir, graceMs: 3000 });

  assert.equal(result.ok, true);
});
