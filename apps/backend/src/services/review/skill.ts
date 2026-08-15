import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Where the canonical shop-check rules live, relative to the repository root.
 *
 * @remarks
 * The file is the same one a human runs the manual check from. Sending it to
 * the provider rather than a copy is what keeps the automated and the manual
 * check from drifting apart, which no amount of version pinning could assure
 * once two copies existed.
 */
const SKILL_RELATIVE_PATH = "skills/lmaa-shop-check.md";

/**
 * Candidate roots the skill file is looked for in.
 *
 * @remarks
 * The backend runs from the repository root in development and from its own
 * deployed directory in production, so both are tried in order.
 */
const SKILL_SEARCH_ROOTS = [".", "..", "../..", "apps/backend"];

/**
 * The canonical rules together with the hash that identifies them.
 */
export interface ReviewSkill {
  /** The canonical rules as they are sent, with the interactive-only block removed. */
  text: string;
  /**
   * SHA-256 of {@link ReviewSkill.text}, used as the skill version on every job.
   *
   * @remarks
   * The hash covers what was actually sent rather than the file on disk. The
   * two differ by one deterministic removal, and a version that identified the
   * file would not identify the rules a verdict was produced under.
   */
  version: string;
  /** Path the text was read from, for diagnosis. */
  path: string;
}

let cached: ReviewSkill | null = null;

/**
 * Sections that only apply to a person running the check in a terminal.
 *
 * @remarks
 * None of these decide a verdict. `timing_and_tokens` measures the run through
 * shell commands the automated run has no shell for, `quick_start` and
 * `validation` describe how a person passes an argument, and `error_handling`
 * and `success_criteria` describe what to print when something goes wrong.
 * The automation validates the URL before it enqueues anything and reports
 * through the job's audit trail instead.
 *
 * Removing them is worth doing rather than tidy: the system prompt is read once
 * per turn of the tool loop, so every token saved is saved about thirty times
 * per check.
 */
const INTERACTIVE_ONLY_SECTIONS = [
  "timing_and_tokens",
  "quick_start",
  "validation",
  "error_handling",
  "success_criteria",
] as const;

/**
 * The acceptance example, which the automation replaces with its own schema.
 *
 * @remarks
 * Matched by a line the example is certain to contain rather than by its
 * position, so a reordering of the rules does not silently stop the removal.
 * A budget test fails when it does stop matching, because the prompt then grows
 * past its allowance.
 */
const ACCEPTANCE_EXAMPLE = /```json\s*\{\s*"name": "Shop Name"[\s\S]*?```\s*/g;

function toAutomationRules(source: string): string {
  let text = source;
  for (const section of INTERACTIVE_ONLY_SECTIONS) {
    text = text.replace(new RegExp(`<${section}>[\\s\\S]*?</${section}>\\s*`, "g"), "");
  }
  return text.replace(ACCEPTANCE_EXAMPLE, "");
}

/**
 * Loads the canonical shop-check rules.
 *
 * @returns The rules and their hash.
 * @throws {Error} When the file cannot be found in any candidate location.
 *
 * @remarks
 * The result is cached for the lifetime of the process. The file only changes
 * with a deployment, and re-reading it per job would make two jobs of the same
 * batch potentially disagree about what the rules were.
 *
 * A missing file throws rather than falling back to an embedded copy. Running
 * the review against rules nobody can point at is worse than not running it.
 */
export function loadReviewSkill(): ReviewSkill {
  if (cached) return cached;

  for (const root of SKILL_SEARCH_ROOTS) {
    const candidate = resolve(process.cwd(), root, SKILL_RELATIVE_PATH);
    if (!existsSync(candidate)) continue;

    const text = toAutomationRules(readFileSync(candidate, "utf8"));
    cached = {
      text,
      version: createHash("sha256").update(text).digest("hex"),
      path: candidate,
    };
    return cached;
  }

  throw new Error(
    `Canonical shop-check rules not found. Looked for ${SKILL_RELATIVE_PATH} under: ${SKILL_SEARCH_ROOTS.join(", ")}`,
  );
}

/**
 * Reports whether the canonical rules can be read.
 *
 * @returns `true` when the file is present and readable.
 *
 * @remarks
 * Used by the worker's readiness check so a deployment that forgot to ship the
 * rules is reported at startup rather than on the first submission.
 */
export function isReviewSkillAvailable(): boolean {
  try {
    loadReviewSkill();
    return true;
  } catch {
    return false;
  }
}
