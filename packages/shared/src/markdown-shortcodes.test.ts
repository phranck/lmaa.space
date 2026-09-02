import { describe, expect, it } from "vitest";

import {
  MARKDOWN_SHORTCODE_DEFINITIONS,
  type MarkdownShortcodeDefinition,
  type MarkdownShortcodeParamDefinition,
} from "./markdown-shortcodes.js";

/** Anything written as `{name}`, which is the notation all three kinds share. */
const BRACED_NAME = /\{[a-zA-Z][a-zA-Z0-9]*\}/;

/** Every parameter in the registry, including those of nested shortcodes. */
function everyParam(): { token: string; param: MarkdownShortcodeParamDefinition }[] {
  const found: { token: string; param: MarkdownShortcodeParamDefinition }[] = [];

  function walk(definition: MarkdownShortcodeDefinition) {
    for (const param of definition.params) found.push({ token: definition.token, param });
    for (const child of definition.children ?? []) walk(child);
  }

  for (const definition of MARKDOWN_SHORTCODE_DEFINITIONS) walk(definition);
  return found;
}

describe("shortcode parameter placeholders", () => {
  it("never explains a placeholder inside a label", () => {
    // A placeholder named in prose is findable only by opening that one
    // shortcode and reading that one sentence, which is what `placeholders`
    // exists to stop. The panel renders the structured field and cannot render
    // the sentence.
    const offenders = everyParam()
      .filter(({ param }) => param.label !== undefined && BRACED_NAME.test(param.label))
      .map(({ token, param }) => `[[${token}]] ${param.name}: ${param.label}`);

    expect(offenders).toEqual([]);
  });

  it("names every placeholder as a plain word, the way it is typed", () => {
    for (const { token, param } of everyParam()) {
      for (const placeholder of param.placeholders ?? []) {
        expect(
          /^[a-zA-Z][a-zA-Z0-9]*$/.test(placeholder.name),
          `[[${token}]] ${param.name} declares {${placeholder.name}}`,
        ).toBe(true);
      }
    }
  });

  it("describes every placeholder as the phrase that follows 'wird ersetzt durch'", () => {
    // The panel writes that phrase itself, so a description starting with a
    // capital reads as a sentence broken in half.
    for (const { token, param } of everyParam()) {
      for (const placeholder of param.placeholders ?? []) {
        expect(
          placeholder.description[0],
          `[[${token}]] ${param.name}: ${placeholder.description}`,
        ).toBe(placeholder.description[0]?.toLowerCase());
      }
    }
  });
});
