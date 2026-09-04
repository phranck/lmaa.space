import { describe, expect, it } from "vitest";

import {
  highlightShortcodes,
  type ShortcodeHighlightSpan,
} from "./markdown-shortcode-highlight.js";

/** The spans as `kind:text` pairs, which is what a reader of a failure wants. */
function marked(content: string): string[] {
  return highlightShortcodes(content).map(
    (span: ShortcodeHighlightSpan) => `${span.kind}:${content.slice(span.from, span.to)}`,
  );
}

/** Every span of one kind, as the text it covers. */
function ofKind(content: string, kind: string): string[] {
  return highlightShortcodes(content)
    .filter((span) => span.kind === kind)
    .map((span) => content.slice(span.from, span.to));
}

describe("the parts of one shortcode", () => {
  it("tells the brackets, the token, the parameter and its value apart", () => {
    expect(marked('[[icon name="heart"]]')).toEqual([
      "bracket:[[",
      "token:icon",
      "attribute-name:name",
      "separator:=",
      'value-string:"heart"',
      "bracket:]]",
    ]);
  });

  it("reads a bare value as its own kind, so a number is not a string", () => {
    expect(ofKind("[[icon size=24]]", "value-bare")).toEqual(["24"]);
    expect(ofKind("[[icon size=24]]", "value-string")).toEqual([]);
  });

  it("marks a flag as the parameter it is, because that is what it names", () => {
    // Nothing follows it, which is the difference, and that needs no colour.
    expect(ofKind("[[option amount=5 recommended]]", "attribute-name")).toEqual([
      "amount",
      "recommended",
    ]);
  });

  it("keeps the quotes with the value they enclose", () => {
    // They mark where it starts and ends, so colouring them apart says nothing.
    expect(ofKind("[[icon name='heart']]", "value-string")).toEqual(["'heart'"]);
  });

  it("separates a target from the token it belongs to", () => {
    expect(marked("[[image:logo]]")).toEqual([
      "bracket:[[",
      "token:image",
      "separator::",
      "target:logo",
      "bracket:]]",
    ]);
  });
});

describe("what the scanner refuses to read as a shortcode", () => {
  it("leaves a single bracket in prose alone", () => {
    expect(marked("Ein [Hinweis] im Text.")).toEqual([]);
  });

  it("leaves an unclosed node alone, so a mistake looks like one", () => {
    // Nothing closes it, so it is not a node, and colouring it as one would
    // claim the page renders something it does not.
    expect(marked("[[icon name=heart")).toEqual([]);
  });

  it("does not read a closing pair inside a quoted value as the end", () => {
    const content = '[[icon name="a ]] b"]]';
    expect(ofKind(content, "value-string")).toEqual(['"a ]] b"']);
    expect(ofKind(content, "bracket")).toEqual(["[[", "]]"]);
  });

  it("skips a bracket pair the document escaped", () => {
    expect(marked("\\[[icon]]")).toEqual([]);
  });
});

describe("a token no definition knows", () => {
  it("marks it apart from one that exists", () => {
    expect(ofKind("[[icon]]", "unknown-token")).toEqual([]);
    expect(ofKind("[[ikon]]", "unknown-token")).toEqual(["ikon"]);
  });

  it("resolves a child against its parent rather than against the document", () => {
    // `option` is a child of `interval`, so it is a token there and nowhere
    // else. The page reads it the same way.
    const inside = '[[support-ladder [[interval key="once" [[option amount=5]]]]]]';
    expect(ofKind(inside, "unknown-token")).toEqual([]);
    expect(ofKind("[[option amount=5]]", "unknown-token")).toEqual(["option"]);
  });

  it("still reads the parts of a token it does not know", () => {
    // The author is most likely mid-typing, and losing every colour at once
    // would be the least helpful moment to do it.
    expect(ofKind('[[ikon name="heart"]]', "value-string")).toEqual(['"heart"']);
  });
});

describe("names that are replaced before a reader sees them", () => {
  it("marks a site variable in prose", () => {
    expect(ofKind("Ein Jahr kostet {annualCost}.", "variable")).toEqual(["{annualCost}"]);
  });

  it("marks a text token in prose", () => {
    expect(ofKind("10{nbsp}€", "variable")).toEqual(["{nbsp}"]);
  });

  it("leaves a brace that names nothing alone", () => {
    // Prose is full of braces that mean nothing, and colouring them would
    // teach the reader to ignore the colour.
    expect(ofKind("Ein {beliebiges} Wort.", "variable")).toEqual([]);
  });

  it("marks a placeholder inside a value, and splits the string around it", () => {
    const content = '[[custom placeholder="ab {min} cd"]]';
    expect(ofKind(content, "variable")).toEqual(["{min}"]);
    expect(ofKind(content, "value-string")).toEqual(['"ab ', ' cd"']);
  });

  it("accepts any name inside a value, because a placeholder belongs to one attribute", () => {
    expect(ofKind('[[interval label="{annualAmount} im Jahr"]]', "variable")).toEqual([
      "{annualAmount}",
    ]);
  });

  it("marks a value that is nothing but a name", () => {
    const content = '[[option amount="{amountMonth}"]]';
    expect(ofKind(content, "variable")).toEqual(["{amountMonth}"]);
    expect(ofKind(content, "value-string")).toEqual(['"', '"']);
  });
});

describe("nesting", () => {
  it("marks a child's parts as its own", () => {
    const content = '[[support-ladder [[interval key="once" [[option amount=5]]]]]]';
    expect(ofKind(content, "token")).toEqual(["support-ladder", "interval", "option"]);
    expect(ofKind(content, "attribute-name")).toEqual(["key", "amount"]);
  });

  it("marks a child written without its parent as unknown, as the page reads it", () => {
    // An `interval` outside a support ladder renders nothing, so it is not a
    // token there and the editor says so rather than colouring it as one.
    expect(ofKind('[[interval key="once"]]', "unknown-token")).toEqual(["interval"]);
  });

  it("marks the braces of a body without touching what stands between them", () => {
    const content = "[[vstack spacing=8 {\n## Titel\n}]]";
    expect(ofKind(content, "body-brace")).toEqual(["{", "}"]);
    // The heading is Markdown and keeps whatever colour Markdown gives it.
    expect(marked(content).some((entry) => entry.includes("Titel"))).toBe(false);
  });

  it("reads a shortcode inside a body as one of its own", () => {
    // A container renders its body as Markdown, so what stands there is a
    // shortcode on the page rather than a child of the container.
    const content = '[[vstack {\n[[icon name="heart"]]\n}]]';
    expect(ofKind(content, "token")).toEqual(["vstack", "icon"]);
    expect(ofKind(content, "unknown-token")).toEqual([]);
  });

  it("finds a variable inside a body", () => {
    expect(ofKind("[[vstack {\nEs fehlen {missingYear}.\n}]]", "variable")).toEqual([
      "{missingYear}",
    ]);
  });

  it("closes a body on its own brace rather than on a nested one", () => {
    // Four braces in document order, so the outer pair encloses the inner one.
    // A body that closed on the first `}` would put them in a different order.
    const content = "[[vstack {\n[[hstack {\nText\n}]]\n}]]";
    const braces = highlightShortcodes(content).filter((span) => span.kind === "body-brace");

    expect(braces.map((span) => content.slice(span.from, span.to))).toEqual(["{", "{", "}", "}"]);
    expect(braces[3].to).toBeGreaterThan(braces[2].to);
    expect(ofKind(content, "token")).toEqual(["vstack", "hstack"]);
  });
});

describe("the span list as a whole", () => {
  it("gives spans in order and never overlapping, which a decoration set needs", () => {
    const content =
      '{annualCost} [[support-ladder [[interval key="once" [[option amount={amountWeek} recommended]]]]]] {nbsp}';
    const spans = highlightShortcodes(content);

    for (let index = 1; index < spans.length; index += 1) {
      expect(spans[index].from).toBeGreaterThanOrEqual(spans[index - 1].to);
    }
  });

  it("marks nothing in a text without shortcodes or names", () => {
    expect(marked("Ganz gewöhnlicher **Markdown**-Text.")).toEqual([]);
  });
});
