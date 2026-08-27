import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown";

describe("the stack shortcodes", () => {
  it("lays a vstack out downwards and an hstack across", async () => {
    const vertical = await renderMarkdown("[[vstack { a }]]");
    const horizontal = await renderMarkdown("[[hstack { a }]]");

    expect(vertical).toContain("md-stack--column");
    expect(horizontal).toContain("md-stack--row");
  });

  it("renders its body as ordinary Markdown", async () => {
    const html = await renderMarkdown("[[vstack {\n## Titel\n\nEin **fetter** Absatz.\n}]]");

    expect(html).toContain("<h2");
    expect(html).toContain("<strong>fetter</strong>");
  });

  it("draws another shortcode standing inside it", async () => {
    const html = await renderMarkdown('[[vstack {\n[[icon name="heart" size=32]]\n}]]');

    expect(html).toContain("md-stack");
    expect(html).toContain("<svg");
    expect(html).toContain('width="32" height="32"');
  });

  it("nests one stack inside another", async () => {
    const html = await renderMarkdown(
      '[[vstack alignment="leading" {\n[[hstack spacing=8 {\n[[icon name="heart" size=16]]\ndaneben\n}]]\n}]]',
    );

    const outer = html.indexOf("md-stack--column");
    const inner = html.indexOf("md-stack--row");
    expect(outer).toBeGreaterThanOrEqual(0);
    expect(inner).toBeGreaterThan(outer);
    expect(html).toContain("<svg");
    expect(html).toContain("daneben");
  });

  it("writes a stated spacing and leaves the stylesheet's own otherwise", async () => {
    expect(await renderMarkdown("[[vstack spacing=24 { a }]]")).toContain("gap: 24px");
    expect(await renderMarkdown("[[vstack { a }]]")).not.toContain("gap:");
  });

  it("names the alignment each axis spells its own way", async () => {
    expect(await renderMarkdown('[[vstack alignment="trailing" { a }]]')).toContain("md-stack--end");
    expect(await renderMarkdown('[[hstack alignment="bottom" { a }]]')).toContain("md-stack--end");
    expect(await renderMarkdown('[[hstack alignment="firstTextBaseline" { a }]]')).toContain(
      "md-stack--baseline",
    );
  });

  it("keeps the axis on the element, because the text alignment hangs off it", async () => {
    // A vertical stack aligns its text as well as its children, and the
    // stylesheet decides that from both classes together. Dropping either one
    // would leave a centred stack with left-aligned paragraphs.
    const html = await renderMarkdown('[[vstack alignment="center" { a }]]');
    expect(html).toContain("md-stack--column");
    expect(html).toContain("md-stack--center");
  });

  it("takes the alignment it is given when the author names none", async () => {
    expect(await renderMarkdown("[[vstack { a }]]")).toContain("md-stack--start");
    expect(await renderMarkdown("[[hstack { a }]]")).toContain("md-stack--center");
  });

  it("leaves the innermost stack as text once the nesting runs too deep", async () => {
    // Five levels against a limit of four, so the fifth is written out rather
    // than drawn and the page still renders.
    const source = `${"[[vstack { ".repeat(5)}tief${" }]]".repeat(5)}`;
    const html = await renderMarkdown(source);

    expect((html.match(/md-stack--column/g) ?? []).length).toBe(4);
    expect(html).toContain("[[vstack");
    expect(html).toContain("tief");
  });

  it("shows a brace the author escaped", async () => {
    const html = await renderMarkdown("[[vstack { ein \\} Zeichen }]]");
    expect(html).toContain("ein } Zeichen");
  });

  it("leaves a container that never closes as text", async () => {
    const html = await renderMarkdown("[[vstack { offen");
    expect(html).toContain("[[vstack");
    expect(html).not.toContain("md-stack");
  });
});

describe("the spacer shortcode", () => {
  it("takes the size it is given, on both axes", async () => {
    const html = await renderMarkdown("[[spacer size=24]]");
    expect(html).toContain("md-spacer");
    expect(html).toContain("flex-basis: 24px");
    expect(html).toContain("height: 24px");
  });

  it("grows into what is left when no size is given", async () => {
    const html = await renderMarkdown("[[spacer]]");
    expect(html).toContain("md-spacer--flexible");
    expect(html).not.toContain("flex-basis");
  });

  it("stands inside a stack, between its other children", async () => {
    const html = await renderMarkdown("[[vstack {\noben\n[[spacer size=32]]\nunten\n}]]");
    const spacer = html.indexOf("md-spacer");
    expect(html.indexOf("oben")).toBeLessThan(spacer);
    expect(spacer).toBeLessThan(html.indexOf("unten"));
  });

  it("refuses a size outside what the registry allows", async () => {
    // 400 is the ceiling, so 900 falls back to the flexible spacer rather than
    // putting an arbitrary number into the page.
    const html = await renderMarkdown("[[spacer size=900]]");
    expect(html).toContain("md-spacer--flexible");
  });
});
