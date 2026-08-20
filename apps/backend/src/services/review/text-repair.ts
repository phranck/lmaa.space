import type { z } from "zod";

import { GERMAN_TEXT_RULE } from "@lmaa/contracts";

/**
 * One text a result carries that breaks a mechanical German rule.
 */
export interface RepairableText {
  /** Where the text sits in the result, such as `accept.description`. */
  path: string;
  /** The text as the provider wrote it. */
  value: string;
  /** What is wrong with it, in the words the contract used. */
  problem: string;
}

/**
 * Finds the texts a failed validation can be repaired by rewriting.
 *
 * @param error - What the contract reported.
 * @param raw - The result as the provider sent it.
 * @returns The offending texts, or an empty list where the failure is about
 * anything other than the surface of a German text.
 *
 * @remarks
 * Returns nothing as soon as one issue is of another kind. A missing field or a
 * contradicted verdict is not a wording problem, and rewriting a sentence would
 * not make such a result usable; that case still costs a fresh run.
 */
export function collectRepairableTexts(error: z.ZodError, raw: unknown): RepairableText[] {
  const texts: RepairableText[] = [];
  const byPath = new Map<string, RepairableText>();

  for (const issue of error.issues) {
    const rule = (issue as { params?: { rule?: unknown } }).params?.rule;
    if (rule !== GERMAN_TEXT_RULE) return [];

    const path = issue.path.join(".");
    const value = readPath(raw, issue.path);
    if (typeof value !== "string") return [];

    const existing = byPath.get(path);
    if (existing) {
      existing.problem = `${existing.problem}; ${issue.message}`;
      continue;
    }

    const entry: RepairableText = { path, value, problem: issue.message };
    byPath.set(path, entry);
    texts.push(entry);
  }

  return texts;
}

/**
 * Puts rewritten texts back into a result.
 *
 * @param raw - The result as the provider sent it.
 * @param repairs - The rewritten texts, by the path they belong at.
 * @returns A copy carrying the rewritten texts.
 *
 * @remarks
 * Only the named paths are touched. Everything the check found stays exactly as
 * it was, which is the point: the research is sound and only its wording was
 * not.
 */
export function applyRepairedTexts(raw: unknown, repairs: Map<string, string>): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  const copy = structuredClone(raw) as Record<string, unknown>;
  for (const [path, text] of repairs) {
    writePath(copy, path.split("."), text);
  }
  return copy;
}

function readPath(raw: unknown, path: ReadonlyArray<string | number>): unknown {
  let current: unknown = raw;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

function writePath(target: Record<string, unknown>, path: string[], value: string): void {
  const last = path.at(-1);
  if (last === undefined) return;

  let current: Record<string, unknown> = target;
  for (const segment of path.slice(0, -1)) {
    const next = current[segment];
    if (typeof next !== "object" || next === null) return;
    current = next as Record<string, unknown>;
  }
  current[last] = value;
}
