import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown";

describe("the icon shortcode", () => {
  it("draws the named icon as inline markup, in duotone", async () => {
    const html = await renderMarkdown('Vorher [[icon name="x-circle" size=96]] nachher');

    expect(html).toContain("<svg");
    expect(html).toContain('width="96" height="96"');
    // Duotone is two paths, one of them carrying the second tone.
    expect((html.match(/<path /g) ?? []).length).toBe(2);
    expect(html).toContain("opacity=");
  });

  it("takes the colour of the text around it when none is given", async () => {
    const html = await renderMarkdown('[[icon name="heart"]]');
    expect(html).toContain('fill="currentColor"');
  });

  it("takes a colour where one is given", async () => {
    const html = await renderMarkdown('[[icon name="heart" color="var(--ds-accent)"]]');
    expect(html).toContain('fill="var(--ds-accent)"');
  });

  it("reads a hex figure with or without its hash", async () => {
    const withHash = await renderMarkdown('[[icon name="heart" color="#cea836"]]');
    const without = await renderMarkdown('[[icon name="heart" color="cea836"]]');

    expect(withHash).toContain('fill="#cea836"');
    expect(without).toContain('fill="#cea836"');
  });

  it("reads the short and the transparent hex forms too", async () => {
    for (const written of ["fff", "#fff", "fff8", "cea83680"]) {
      const html = await renderMarkdown(`[[icon name="heart" color="${written}"]]`);
      expect(html).toContain(`fill="#${written.replace("#", "")}"`);
    }
  });

  it("reads a colour named in words", async () => {
    const html = await renderMarkdown('[[icon name="heart" color="tomato"]]');
    expect(html).toContain('fill="tomato"');
  });

  it("falls back to the surrounding text where the value is no colour", async () => {
    // A value that reaches fill unread can name a paint server rather than a colour.
    const html = await renderMarkdown('[[icon name="heart" color="url(#anything)"]]');
    expect(html).toContain('fill="currentColor"');
  });

  it("falls back to a readable size when none is given", async () => {
    const html = await renderMarkdown('[[icon name="heart"]]');
    expect(html).toContain('width="24" height="24"');
  });

  it("leaves the shortcode standing where the name is no icon", async () => {
    // So whoever wrote it sees the mistake rather than an empty space.
    const html = await renderMarkdown('[[icon name="definitely-not-an-icon"]]');

    expect(html).not.toContain("<svg");
    expect(html).toContain("definitely-not-an-icon");
  });

  it("puts a label beside the icon and lays the two out as the alignment says", async () => {
    const html = await renderMarkdown('[[icon name="heart" text="Danke!" textalignment="topLeading"]]');

    expect(html).toContain("md-icon-pair--row-reverse");
    expect(html).toContain("md-icon-pair--start");
    expect(html).toContain(">Danke!<");
  });

  it("puts a label after the icon when no alignment says otherwise", async () => {
    const html = await renderMarkdown('[[icon name="heart" text="Danke!"]]');
    expect(html).toContain("md-icon-pair--row");
  });

  it("reads an alignment the way SwiftUI writes it, and the ways one might", async () => {
    for (const written of [".topLeading", "topLeading", "topleading", "top-leading", " TOP_LEADING "]) {
      const html = await renderMarkdown(`[[icon name="heart" text="x" textalignment="${written}"]]`);
      expect(html, written).toContain("md-icon-pair--row-reverse");
    }
  });

  it("reads the parameter under each of its spellings", async () => {
    for (const key of ["textalignment", "textAlignment", "text-alignment"]) {
      const html = await renderMarkdown(`[[icon name="heart" text="x" ${key}="topLeading"]]`);
      expect(html, key).toContain("md-icon-pair--start");
    }
  });

  it("floats the icon so a paragraph runs around it when no label is given", async () => {
    const html = await renderMarkdown('[[icon name="heart" textalignment="trailing"]]\nEin Absatz daneben.');

    expect(html).toContain("md-icon--float-start");
    expect(html).not.toContain("md-icon-pair");
    expect(html).toContain("Ein Absatz daneben.");
  });

  it("puts the text on the same side whether it is a label or the paragraph", async () => {
    // The alignment names where the text goes. In the floating case it once
    // named the icon's side instead, so one word meant opposite things in the
    // two modes and trailing put the text on the left.
    const label = await renderMarkdown('[[icon name="heart" text="rechts" textalignment="trailing"]]');
    const paragraph = await renderMarkdown('[[icon name="heart" textalignment="trailing"]]\nrechts.');

    // Icon first, so its label follows on the right.
    expect(label).toContain("md-icon-pair--row");
    expect(label).not.toContain("md-icon-pair--row-reverse");
    // Icon floated left, so the paragraph runs down its right.
    expect(paragraph).toContain("md-icon--float-start");
  });

  it("places the symbol itself through alignment, not through the text's", async () => {
    const centred = await renderMarkdown('[[icon name="heart" alignment="center"]]');
    const right = await renderMarkdown('[[icon name="heart" alignment="trailing"]]');

    expect(centred).toContain("md-icon--align-center");
    expect(right).toContain("md-icon--align-end");
  });

  it("leaves the symbol in the text flow where an alignment names no side to flow past", async () => {
    // center says where a symbol stands, not that a paragraph runs past it, so
    // the text's alignment must not quietly place the symbol as well.
    const html = await renderMarkdown('[[icon name="heart" textalignment="center"]]');

    expect(html).not.toContain("md-icon--float");
    expect(html).not.toContain("md-icon--align");
  });

  it("places a labelled pair as a whole, keeping the label where it was put", async () => {
    const html = await renderMarkdown(
      '[[icon name="heart" text="Danke" textalignment="top" alignment="center"]]',
    );

    expect(html).toContain("md-icon-pair--column-reverse");
    expect(html).toContain("md-icon--align-center");
  });

  it("lays the label over the symbol for center, the way a ZStack does", async () => {
    const html = await renderMarkdown('[[icon name="heart" text="7" textalignment="center"]]');
    expect(html).toContain("md-icon-pair--stacked");
  });

  it("stays a plain inline symbol where neither label nor alignment is given", async () => {
    const html = await renderMarkdown('[[icon name="heart"]]');

    expect(html).not.toContain("md-icon-pair");
    expect(html).not.toContain("md-icon--");
  });

  it("ignores an alignment that names none", async () => {
    const html = await renderMarkdown('[[icon name="heart" textalignment="sideways"]]');
    expect(html).not.toContain("md-icon--");
  });

  it("reads the label as Markdown", async () => {
    const html = await renderMarkdown('[[icon name="heart" text="**Danke** für *alles*"]]');

    expect(html).toContain("<strong>Danke</strong>");
    expect(html).toContain("<em>alles</em>");
  });

  it("reads a heading in the label, and wraps the pair so it is allowed to stand there", async () => {
    // A heading inside a span makes the browser break the paragraph open, so a
    // label that carries one turns the pair into a div.
    const html = await renderMarkdown('[[icon name="atom" text="## Headline"]]');

    expect(html).toContain("<h2");
    expect(html).toContain('<div class="md-icon-pair');
    expect(html).not.toContain('<span class="md-icon-pair');
  });

  it("keeps a label of a few words inside the line", async () => {
    const html = await renderMarkdown('[[icon name="heart" text="Danke"]]');

    expect(html).toContain('<span class="md-icon-pair');
    // The paragraph marked would wrap it in is dropped, so the label sits on
    // the icon's line rather than under it.
    expect(html).not.toContain("<p>Danke</p>");
  });

  it("holds a link in the label to the same rules as one in the text", async () => {
    const html = await renderMarkdown(
      '[[icon name="heart" text="[Zur Seite](https://lmaa.space/support)"]]',
    );

    expect(html).toContain('href="https://lmaa.space/support"');
  });

  it("escapes the label", async () => {
    const html = await renderMarkdown('[[icon name="heart" text="<img src=x onerror=alert(1)>"]]');

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes what it puts into an attribute", async () => {
    const html = await renderMarkdown('[[icon name="heart" color="\\" onload=\\"alert(1)"]]');
    expect(html).not.toContain("onload=");
  });
});
