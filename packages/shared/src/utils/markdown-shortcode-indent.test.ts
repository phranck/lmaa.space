import { describe, expect, it } from "vitest";

import {
  reindentShortcodeBlock,
  shortcodeBraceDelta,
  shortcodeIndentDepth,
  shortcodeIndentFor,
  shortcodeLineDepth,
  shortcodePasteRewrite,
} from "./markdown-shortcode-indent.js";

describe("shortcodeBraceDelta", () => {
  it("opens a level on a line that opens a container", () => {
    expect(shortcodeBraceDelta('[[vstack alignment="leading" {')).toBe(1);
  });

  it("closes a level on a line that closes one", () => {
    expect(shortcodeBraceDelta("}]]")).toBe(-1);
  });

  it("stays level on a container that opens and closes in one line", () => {
    expect(shortcodeBraceDelta("[[hstack { a }]]")).toBe(0);
  });

  it("ignores a brace in prose, which carries no shortcode", () => {
    expect(shortcodeBraceDelta("Ein { in einem Satz.")).toBe(0);
    expect(shortcodeBraceDelta("und ein } dazu")).toBe(0);
  });

  it("ignores a brace in code, for the same reason", () => {
    expect(shortcodeBraceDelta("  const shape = {")).toBe(0);
    expect(shortcodeBraceDelta("  }")).toBe(0);
  });

  it("skips a brace the author escaped", () => {
    expect(shortcodeBraceDelta("[[vstack { \\{ }]]")).toBe(0);
    expect(shortcodeBraceDelta("[[vstack { \\} ")).toBe(1);
  });

  it("counts a line that opens two containers at once", () => {
    expect(shortcodeBraceDelta("[[vstack { [[hstack {")).toBe(2);
  });
});

describe("shortcodeIndentDepth", () => {
  const document = [
    "[[vstack {", // 0
    "Ein Absatz.", // 1
    "[[hstack {", // 2
    "daneben", // 3
    "}]]", // 4
    "danach", // 5
    "}]]", // 6
    "nach allem", // 7
  ];

  it("counts the containers open at the end of each line", () => {
    expect(shortcodeIndentDepth(document, 0)).toBe(1);
    expect(shortcodeIndentDepth(document, 1)).toBe(1);
    expect(shortcodeIndentDepth(document, 2)).toBe(2);
    expect(shortcodeIndentDepth(document, 3)).toBe(2);
    expect(shortcodeIndentDepth(document, 4)).toBe(1);
    expect(shortcodeIndentDepth(document, 6)).toBe(0);
  });

  it("never goes below zero on a stray closing line", () => {
    expect(shortcodeIndentDepth(["}]]", "danach"], 0)).toBe(0);
    expect(shortcodeIndentDepth(["}]]", "danach"], 1)).toBe(0);
  });
});

describe("shortcodeIndentFor", () => {
  /** Asks at the end of the text, which is where Return is pressed. */
  function atEnd(text: string, unit?: string): string | null {
    return shortcodeIndentFor(text, text.length, unit);
  }

  /** Asks at the start of the last line, which is what typing asks. */
  function atLastLineStart(text: string): string | null {
    return shortcodeIndentFor(text, text.lastIndexOf("\n") + 1);
  }

  it("steps in after a container opens", () => {
    expect(atEnd("[[vstack {")).toBe("  ");
  });

  it("steps in twice inside two containers", () => {
    expect(atEnd("[[vstack {\n  [[hstack {")).toBe("    ");
  });

  it("takes the unit it is given", () => {
    expect(atEnd("[[vstack {", "    ")).toBe("    ");
  });

  it("pulls a closing line back out", () => {
    expect(atLastLineStart("[[vstack {\n  drin\n  }]]")).toBe("");
    expect(atLastLineStart("[[vstack {\n  [[hstack {\n    drin\n    }]]")).toBe("  ");
  });

  it("leaves ordinary prose to the editor's own rules", () => {
    expect(atEnd("Ein Absatz.")).toBeNull();
    expect(atEnd("[[vstack {\n  drin")).toBeNull();
  });

  it("leaves a list alone, so Markdown keeps deciding", () => {
    expect(atEnd("- ein Punkt")).toBeNull();
    expect(atEnd("[[vstack {\n  - ein Punkt")).toBeNull();
  });

  it("says nothing about a container that opens and closes in one line", () => {
    expect(atEnd("[[hstack { a }]]")).toBeNull();
  });

  it("does not step in from the start of an opening line", () => {
    // Typing at the head of `[[vstack {` is not the moment to indent it; that
    // line belongs to the level it opens from.
    expect(shortcodeIndentFor("[[vstack {", 0)).toBeNull();
  });
});

describe("shortcodeLineDepth", () => {
  const document = ["[[vstack {", "drin", "[[hstack {", "tiefer", "}]]", "}]]", "danach"];

  it("puts a line on the level of the containers around it", () => {
    expect(shortcodeLineDepth(document, 0)).toBe(0);
    expect(shortcodeLineDepth(document, 1)).toBe(1);
    expect(shortcodeLineDepth(document, 2)).toBe(1);
    expect(shortcodeLineDepth(document, 3)).toBe(2);
    expect(shortcodeLineDepth(document, 6)).toBe(0);
  });

  it("puts a closing line beside the line that opened it", () => {
    expect(shortcodeLineDepth(document, 4)).toBe(1);
    expect(shortcodeLineDepth(document, 5)).toBe(0);
  });
});

describe("reindentShortcodeBlock", () => {
  it("indents a flat block by its own structure and the level it lands on", () => {
    const block = ['[[hstack spacing=8 {', '[[icon name="heart" size=24]]', "daneben", "}]]"].join(
      "\n",
    );

    expect(reindentShortcodeBlock(block, 1)).toBe(
      [
        "  [[hstack spacing=8 {",
        '    [[icon name="heart" size=24]]',
        "    daneben",
        "  }]]",
      ].join("\n"),
    );
  });

  it("keeps what a line indents beyond its own level", () => {
    const block = ["[[vstack {", "  - ein Punkt", "    - tiefer", "}]]"].join("\n");

    expect(reindentShortcodeBlock(block, 1)).toBe(
      ["  [[vstack {", "    - ein Punkt", "      - tiefer", "  }]]"].join("\n"),
    );
  });

  it("leaves a block alone that involves no container at all", () => {
    const block = "Ein Absatz.\n\n  const shape = {\n    a: 1,\n  };";
    expect(reindentShortcodeBlock(block, 0)).toBe(block);
  });

  it("carries plain text onto the level it lands on", () => {
    expect(reindentShortcodeBlock("Ein Absatz.\nund noch einer", 1)).toBe(
      "  Ein Absatz.\n  und noch einer",
    );
  });

  it("leaves an empty line empty rather than filling it with spaces", () => {
    expect(reindentShortcodeBlock("[[vstack {\n\n}]]", 1)).toBe("  [[vstack {\n\n  }]]");
  });

  it("changes nothing when a block already sits right at the top level", () => {
    const block = ["[[vstack {", "  drin", "}]]"].join("\n");
    expect(reindentShortcodeBlock(block, 0)).toBe(block);
  });
});

describe("shortcodePasteRewrite", () => {
  /** Pastes `block` at the end of `before`, which is where a caret sits. */
  function pasteAtEnd(before: string, block: string) {
    return shortcodePasteRewrite(before, before.length, before.length, block);
  }

  /** Applies what the rewrite says, so a test can read the result. */
  function applied(before: string, block: string): string {
    const rewrite = pasteAtEnd(before, block);
    if (!rewrite) return before + block;
    return before.slice(0, rewrite.from) + rewrite.insert + before.slice(rewrite.to);
  }

  it("indents a single line pasted at the start of a line in a container", () => {
    // The case that went wrong: a heading pasted on its own line inside a
    // container arrived flat against the margin.
    expect(applied("[[vstack {\n", "## Werde Sponsor")).toBe("[[vstack {\n  ## Werde Sponsor");
  });

  it("indents a single line even where the caret already sits on indentation", () => {
    expect(applied("[[vstack {\n  ", "## Werde Sponsor")).toBe("[[vstack {\n  ## Werde Sponsor");
  });

  it("leaves a phrase dropped into the middle of a sentence alone", () => {
    expect(pasteAtEnd("[[vstack {\n  Ein Satz ", "und mehr")).toBeNull();
  });

  it("indents a multi-line block by its own structure", () => {
    const block = '[[hstack {\n[[icon name="heart"]]\ndaneben\n}]]';
    expect(applied("[[vstack {\n", block)).toBe(
      ['[[vstack {', "  [[hstack {", '    [[icon name="heart"]]', "    daneben", "  }]]"].join("\n"),
    );
  });

  it("leaves a paste outside every container exactly as it was", () => {
    expect(pasteAtEnd("Vorher\n", "Ein Absatz.\n\n  const shape = {")).toBeNull();
  });

  it("leaves a block that already sits right alone", () => {
    expect(pasteAtEnd("", "[[vstack {\n  drin\n}]]")).toBeNull();
  });

  it("says nothing where the caret already sits at the right indentation", () => {
    const before = "[[vstack {\n  ";
    expect(shortcodePasteRewrite(before, before.length, before.length, "Text")).toBeNull();
  });

  it("replaces an indentation that is too shallow, from the start of the line", () => {
    const before = "[[vstack {\n[[hstack {\n";
    const rewrite = shortcodePasteRewrite(before, before.length, before.length, "Text");
    expect(rewrite?.from).toBe(before.length);
    expect(rewrite?.insert).toBe("    Text");
  });
});
