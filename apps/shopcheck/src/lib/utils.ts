import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

import type { Args, RunnerState } from "../types";

export function nowIso(): string {
  return new Date().toISOString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseArgs(argv: string[]): Args {
  const args: Args = { batchSize: null, singleUrl: null, importFile: null, help: false, statusOnly: false, resetOnly: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--batch") {
      const n = Number(argv[i + 1]);
      args.batchSize = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
      i += 1;
      continue;
    }
    if (token === "--url") {
      args.singleUrl = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--import") {
      args.importFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--help" || token === "-h") args.help = true;
    if (token === "--status") args.statusOnly = true;
    if (token === "--reset") args.resetOnly = true;
  }
  return args;
}

export function readJson<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function isResumableState(state: RunnerState): boolean {
  const processed = Array.isArray(state.processedShopIds) ? state.processedShopIds.length : 0;
  if (processed === 0) return false;
  if (!Number.isFinite(state.total) || state.total <= 0) return true;
  return state.completed < state.total;
}

export function writeJson(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function appendNdjson(file: string, value: unknown): void {
  appendFileSync(file, `${JSON.stringify(value)}\n`, "utf8");
}

export function tryParseJson<T = unknown>(raw: string): T | null {
  // Extract JSON from between markdown code fences (```json ... ```)
  const fenceMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/i);
  const fenceContent = fenceMatch ? fenceMatch[1] : null;

  for (const candidate of [raw, fenceContent].filter(Boolean) as string[]) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Common local-LLM JSON quirks: trailing commas, single-line comments, BOM
      const cleaned = candidate
        .replace(/^\uFEFF/, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/,\s*([}\]])/g, "$1");
      try {
        return JSON.parse(cleaned) as T;
      } catch {
        // try next candidate
      }
    }
  }
  return null;
}
