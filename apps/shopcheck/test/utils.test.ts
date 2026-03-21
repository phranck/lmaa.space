import assert from "node:assert/strict";
import test from "node:test";

import { isResumableState, parseArgs, tryParseJson } from "../src/lib/utils";
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

test("parseArgs ignores unknown flags", () => {
  const args = parseArgs(["node", "shopcheck", "--foo", "bar"]);
  assert.equal("provider" in args, false);
  assert.equal(args.batchSize, null);
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
    provider: "ollama",
    model: "qwen3.5:397b-cloud",
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
    provider: "ollama",
    model: "qwen3.5:397b-cloud",
    pipelineProgress: 0,
    metrics: { parseFailures: 0, timeouts: 0, succeeded: 0 },
  } satisfies RunnerState;
  assert.equal(isResumableState(state), false);
});

test("tryParseJson parses fenced json with surrounding text", () => {
  const raw = 'Hier ist die Analyse.\n```json\n{"verdict":"accept"}\n```\nDanke.';
  assert.deepEqual(tryParseJson(raw), { verdict: "accept" });
});

test("tryParseJson parses json after think block", () => {
  const raw = '<think>internal reasoning</think>\n{"verdict":"reject"}';
  assert.deepEqual(tryParseJson(raw), { verdict: "reject" });
});
