import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isReviewSkillAvailable, loadReviewSkill } from "../services/review/skill.js";

/** Where the canonical rules live, relative to this test file. */
const CANONICAL_PATH = path.resolve(import.meta.dirname, "../../../../skills/lmaa-shop-check.md");

describe("loadReviewSkill", () => {
  it("finds the canonical rules from the backend's working directory", () => {
    expect(isReviewSkillAvailable()).toBe(true);
  });

  it("returns a stable hash of what it sends", () => {
    const first = loadReviewSkill();
    const second = loadReviewSkill();
    expect(first.version).toMatch(/^[0-9a-f]{64}$/);
    expect(second.version).toBe(first.version);
  });

  it("keeps the rules that decide a verdict", () => {
    const { text } = loadReviewSkill();
    expect(text).toContain("<company_size_check>");
    expect(text).toContain("<decision_logic>");
    expect(text).toContain("<rejection_research>");
    expect(text).toContain("admissioncriteria");
  });

  it("drops the shell commands that only an interactive run can follow", () => {
    // The canonical file asks a person to time the run through shell commands.
    // The automated run has no shell, so sending them would spend a tool call
    // on discovering they cannot be run. Two later sections still mention the
    // removed block in passing; the automation addendum in `prompt.ts` says
    // outright that the runtime and token lines do not apply, which is stabler
    // than editing prose out of the canonical rules from here.
    const source = readFileSync(CANONICAL_PATH, "utf8");
    expect(source).toContain("lmaa_shop_check_transcript");

    const { text } = loadReviewSkill();
    expect(text).not.toContain("lmaa_shop_check_transcript");
    expect(text).not.toContain("/tmp/lmaa_shop_check_start.txt");
  });

  it("keeps the rules within their size budget", () => {
    // The system prompt is read once per turn of the tool loop, about thirty
    // times per check, so every character is paid for thirty times over. A
    // measured run read 669 000 cached tokens and most of that was this text.
    // The budget is what stops a removal that quietly stopped matching, or a
    // section that grew back, from raising the cost of every future check.
    const { text } = loadReviewSkill();
    expect(text.length).toBeLessThan(26_000);
  });

  it("drops the sections that decide nothing about a verdict", () => {
    const { text } = loadReviewSkill();
    for (const section of ["quick_start", "validation", "error_handling", "success_criteria"]) {
      expect(text).not.toContain(`<${section}>`);
    }
    // The acceptance example is replaced by the schema in the automation
    // addendum, so sending both would describe the same shape twice.
    expect(text).not.toContain('"name": "Shop Name"');
  });

  it("keeps the content rules the addendum does not restate", () => {
    const { text } = loadReviewSkill();
    // These live inside the output-format section and decide what a published
    // German text may say, so that section stays even though the addendum
    // replaces the shape it describes.
    expect(text).toContain("inhabergeführt");
    expect(text).toContain("Langbegründung");
    expect(text).toContain("Gender-neutral");
  });

  it("hashes what is sent rather than the file on disk", () => {
    const source = readFileSync(CANONICAL_PATH, "utf8");
    expect(loadReviewSkill().text).not.toBe(source);
  });
});
