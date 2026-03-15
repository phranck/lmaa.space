import assert from "node:assert/strict";
import test from "node:test";

import { isResumableState, parseArgs } from "../src/lib/utils";
import type { RunnerState } from "../src/types";

test("parseArgs parses batch", () => {
  const args = parseArgs(["node", "shopcheck", "--batch", "12"]);
  assert.equal(args.batchSize, 12);
  assert.equal(args.help, false);
});

test("parseArgs parses flags", () => {
  const args = parseArgs(["node", "shopcheck", "--status", "--reset", "--help"]);
  assert.equal(args.statusOnly, true);
  assert.equal(args.resetOnly, true);
  assert.equal(args.help, true);
});

test("parseArgs defaults to no explicit provider", () => {
  const args = parseArgs(["node", "shopcheck"]);
  assert.equal(args.provider, null);
});

test("parseArgs parses provider", () => {
  const args = parseArgs(["node", "shopcheck", "--provider", "ollama"]);
  assert.equal(args.provider, "ollama");
});

test("isResumableState true when progress exists and total unknown", () => {
  const state = {
    status: "stopped",
    startedAt: null,
    updatedAt: null,
    completed: 2,
    total: 0,
    processedShopIds: [1, 2],
    currentShop: null,
    mode: "run",
    provider: "claude",
    model: "claude-haiku-4-5-20251001",
    pipelineProgress: 0,
    metrics: { parseFailures: 0, timeouts: 0, succeeded: 0 },
  } satisfies RunnerState;
  assert.equal(isResumableState(state), true);
});

test("isResumableState false when completed equals total", () => {
  const state = {
    status: "completed",
    startedAt: null,
    updatedAt: null,
    completed: 3,
    total: 3,
    processedShopIds: [1, 2, 3],
    currentShop: null,
    mode: "run",
    provider: "claude",
    model: "claude-haiku-4-5-20251001",
    pipelineProgress: 0,
    metrics: { parseFailures: 0, timeouts: 0, succeeded: 0 },
  } satisfies RunnerState;
  assert.equal(isResumableState(state), false);
});
