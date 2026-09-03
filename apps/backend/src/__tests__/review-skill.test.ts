import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isReviewSkillAvailable,
  loadReviewSkill,
  toAutomationRules,
} from "../services/review/skill.js";

/** Where the canonical rules live, relative to this test file. */
const CANONICAL_PATH = path.resolve(
  import.meta.dirname,
  "../../../../.claude/skills/lmaa-shop-check/SKILL.md",
);

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
    // The eight criteria, the seat rule and the size research are what a
    // verdict rests on. All three survive the trim.
    expect(text).toContain("Alle acht Kriterien intern bewerten");
    expect(text).toContain("Rechtssitz des Unternehmens muss in");
    expect(text).toContain("Unternehmensgröße aktiv recherchieren");
    expect(text).toContain("Ablehnung vertiefen");
  });

  it("keeps the payment step and its canonical keys", () => {
    // Held against the rules themselves rather than against a list here. The
    // automation once ran against a copy of the rules that had no payment
    // step, and every result came back without one, which nothing caught.
    const { text } = loadReviewSkill();
    expect(text).toContain("Zahlungsmethoden belegen");
    for (const key of ["paypal", "credit_card", "sepa", "klarna", "apple_pay"]) {
      expect(text).toContain(key);
    }
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
    // "When to Use" says when a person reaches for the skill and
    // "Prerequisites" lists what a person has to look up. Neither applies to a
    // run the worker starts with the criteria already in the task.
    expect(text).not.toContain("## When to Use");
    expect(text).not.toContain("## Prerequisites");
    // Removing a section must not take the ones around it with it.
    expect(text).toContain("## Procedure");
    expect(text).toContain("## Output");
    // The acceptance example is replaced by the schema in the automation
    // addendum, so sending both would describe the same shape twice.
    expect(text).not.toContain('"name": "Shop Name"');
  });

  it("removes a section that sits last in the file", () => {
    // JavaScript has no end-of-input anchor, so a pattern ending in `$` under
    // the `m` flag stops at a line break and one ending in `\\Z` matches a
    // literal Z. Either would leave the last section of a file in place, which
    // no fixture in this repository would notice.
    const trimmed = toAutomationRules("## Procedure\n\nbleibt.\n\n## Prerequisites\n\nfliegt raus.\n");
    expect(trimmed).toContain("bleibt.");
    expect(trimmed).not.toContain("fliegt raus.");
  });

  it("keeps the content rules the addendum does not restate", () => {
    const { text } = loadReviewSkill();
    // These decide what a published German text may say, and the addendum
    // restates only the two the backend also checks mechanically.
    expect(text).toContain("Mitarbeitende");
    expect(text).toContain("Gedankenstriche");
    expect(text).toContain("Langbegründung");
    expect(text).toContain("Erfinde nichts");
  });

  it("sends the European seat as a criterion and shipping reach as data", () => {
    const { text } = loadReviewSkill();
    // The published criteria admit companies registered in Europe. Shipping
    // reach fills `shippingRegions` and gates nothing, because a shop outside
    // Europe that ships worldwide also sells into Europe.
    expect(text).toContain("Rechtssitz");
    expect(text).toContain("Versand entscheidet nicht über die Aufnahme");
    expect(text).toContain("Weltweiter Versand hilft oder schadet der Aufnahme nicht");
  });

  it("hashes what is sent rather than the file on disk", () => {
    const source = readFileSync(CANONICAL_PATH, "utf8");
    expect(loadReviewSkill().text).not.toBe(source);
  });
});
