import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Where the canonical shop-check rules live, relative to the repository root.
 *
 * @remarks
 * This is the skill a person runs the manual check from, at the path Claude
 * Code documents for a project skill. Sending that file rather than a copy is
 * what keeps the automated and the manual check from drifting apart, which no
 * amount of version pinning could assure once two copies existed. It cost one
 * live check to learn that: the automation ran for weeks against a copy that
 * had no payment-method step, so no result ever carried one.
 */
const SKILL_RELATIVE_PATH = ".claude/skills/lmaa-shop-check/SKILL.md";

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
 * Headings whose sections only apply to a person invoking the check.
 *
 * @remarks
 * None of these decide a verdict. "When to Use" says when a person reaches for
 * the skill, and "Prerequisites" lists the tools and the two addresses a person
 * needs to look up. The automation is handed the criteria and the categories in
 * the task itself, and it has a different set of tools, which the addendum in
 * `prompt.ts` names.
 *
 * Removing them is worth doing rather than tidy: the system prompt is read once
 * per turn of the tool loop, so every token saved is saved about thirty times
 * per check.
 */
const INTERACTIVE_ONLY_HEADINGS = ["When to Use", "Prerequisites"] as const;

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

/**
 * One pattern per interactive-only section, built once rather than per call.
 *
 * @remarks
 * A section runs from its own heading to the next heading of the same level or
 * to the end of the file, which is how Markdown delimits one without marking
 * where it stops.
 *
 * The end of the file is written as `$(?![\s\S])` because JavaScript has no
 * end-of-input anchor: under the `m` flag `$` is the end of a line, and `\Z`
 * is a literal `Z`. Either of those would leave a section in place whenever it
 * happens to be the last one in the file.
 *
 * `String.replace` resets a global regex's `lastIndex` when it finishes, so
 * reusing these across calls carries no state between them.
 */
const INTERACTIVE_ONLY_SECTION_PATTERNS = INTERACTIVE_ONLY_HEADINGS.map(
  (heading) => new RegExp(`^## ${heading}\\b[\\s\\S]*?(?=^## |$(?![\\s\\S]))`, "gm"),
);

/**
 * Turns the canonical rules into what the automated run is sent.
 *
 * @param source - The rules exactly as the file holds them.
 * @returns The rules without the sections a person needs and the automation
 * does not, and without the acceptance example the addendum replaces.
 *
 * @remarks
 * Exported so the removal can be exercised against a fixture. The rules in this
 * repository never have an interactive section last, so nothing here would
 * notice a pattern that cannot reach the end of a file.
 */
export function toAutomationRules(source: string): string {
  let text = source;
  for (const pattern of INTERACTIVE_ONLY_SECTION_PATTERNS) {
    text = text.replace(pattern, "");
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
