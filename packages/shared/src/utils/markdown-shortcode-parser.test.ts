import { describe, expect, it } from "vitest";

import { MARKDOWN_SHORTCODE_TOKENS } from "../markdown-shortcodes.js";
import { parseMarkdownShortcodes } from "./markdown-shortcode-parser.js";

describe("parseMarkdownShortcodes", () => {

  it("resolves a child against the parent definition rather than the document", () => {
    const content = [
      "[[support-ladder",
      "  [[bankaccount",
      '    purposeDonation="Spende: lmaa.space"',
      '    purposeSponsor="Sponsor: lmaa.space"',
      '    [[variant key="once" title="Überweisung"]]',
      "  ]]",
      "]]",
    ].join("\n");

    const [ladder] = parseMarkdownShortcodes(content);
    expect(ladder.token).toBe(MARKDOWN_SHORTCODE_TOKENS.supportLadder);

    const [account] = ladder.children;
    expect(account.token).toBe("bankaccount");
    expect(account.params.purposeDonation).toBe("Spende: lmaa.space");
    expect(account.params.purposeSponsor).toBe("Sponsor: lmaa.space");
    expect(account.children[0].params.key).toBe("once");
    expect(account.children[0].params.title).toBe("Überweisung");
  });

  it("does not resolve a child token at the top level", () => {
    // "option" is meaningful inside "interval" and nowhere else, so a stray one
    // in the page body is left alone rather than parsed.
    expect(parseMarkdownShortcodes('[[option amount=5]]')).toHaveLength(0);
  });

  it("accepts label and description as aliases of title and text", () => {
    const content = [
      "[[support-ladder",
      '  [[interval key="once" label="Einmalig" text="Vorausgewählt."',
      '    [[option amount=5 description="Deckt zwei Wochen."]]',
      "  ]]",
      "]]",
    ].join("\n");

    const [ladder] = parseMarkdownShortcodes(content);
    const [interval] = ladder.children;
    expect(interval.params.label).toBe("Einmalig");
    expect(interval.children[0].params.description).toBe("Deckt zwei Wochen.");
  });

  it("keeps every occurrence of a repeated attribute, in order", () => {
    const [shortcode] = parseMarkdownShortcodes('[[pdf:promo alt="a" alt="b"]]');
    const values = shortcode.rawAttributes
      .filter((attribute) => attribute.name === "alt")
      .map((attribute) => attribute.value);

    expect(values).toEqual(["a", "b"]);
  });

  it("stops at the first closing pair rather than running on", () => {
    const content = '[[image:/uploads/a.png]] text [[image:/uploads/b.png]]';
    const found = parseMarkdownShortcodes(content);
    expect(found).toHaveLength(2);
    expect(found[0].target).toBe("/uploads/a.png");
    expect(found[1].target).toBe("/uploads/b.png");
  });

  it("does not swallow the document between a stray opener and a distant closer", () => {
    // Newlines are allowed inside a shortcode, so without a length cap this
    // stray "[[" would reach the closing pair far below and consume the prose
    // in between.
    const content = [
      "[[image:/uploads/a.png",
      "x".repeat(8100),
      "[[image:/uploads/b.png]]",
    ].join("\n");

    const found = parseMarkdownShortcodes(content);
    expect(found).toHaveLength(1);
    expect(found[0].target).toBe("/uploads/b.png");
  });
  it("parses target-style shortcodes with quoted and bare attributes", () => {
    const [token] = parseMarkdownShortcodes(
      "Intro [[image:hero alt=\"Hero image\" width=320 caption='Launch']] outro",
    );

    expect(token?.token).toBe(MARKDOWN_SHORTCODE_TOKENS.image);
    expect(token?.target).toBe("hero");
    expect(token?.attributes).toEqual({
      alt: "Hero image",
      width: "320",
      caption: "Launch",
    });
    expect(token?.params).toEqual({
      alt: "Hero image",
      width: 320,
      caption: "Launch",
    });
    expect(token?.issues).toEqual([]);
  });

  it("keeps bare attributes as flag values", () => {
    const [token] = parseMarkdownShortcodes("[[pdf:promo featured title='Promo']]");

    expect(token?.rawAttributes).toContainEqual({
      name: "featured",
      value: true,
      quoted: "flag",
    });
    expect(token?.attributes.featured).toBe(true);
    expect(token?.params.title).toBe("Promo");
  });

  it("normalizes enum params with defaults and reports invalid values", () => {
    const [token] = parseMarkdownShortcodes("[[rejected-shops-table pageSize=999]]");

    expect(token?.token).toBe(MARKDOWN_SHORTCODE_TOKENS.rejectedShopsTable);
    expect(token?.params.pageSize).toBe("15");
    expect(token?.issues).toContainEqual({
      code: "invalid-param",
      message: 'Shortcode parameter "pageSize" is invalid.',
      attribute: "pageSize",
    });
  });

  it("parses targetless block shortcodes", () => {
    const [token] = parseMarkdownShortcodes(
      '[[rejected-shops-table defaultPageSize="30" id="transparency"]]',
    );

    expect(token?.target).toBeUndefined();
    expect(token?.params).toEqual({
      pageSize: "30",
      id: "transparency",
    });
    expect(token?.source.raw).toBe(
      '[[rejected-shops-table defaultPageSize="30" id="transparency"]]',
    );
  });

  it("preserves unknown and escaped shortcode text by not returning tokens", () => {
    expect(parseMarkdownShortcodes("[[unknown:value]]")).toEqual([]);
    expect(parseMarkdownShortcodes("\\[[image:hero]]")).toEqual([]);
  });

  it("reports target rule violations without discarding the parsed token", () => {
    const [token] = parseMarkdownShortcodes("[[rejected-shops-table:foo]]");

    expect(token?.issues).toContainEqual({
      code: "target-forbidden",
      message: 'Shortcode "rejected-shops-table" does not support a target.',
    });
  });

  describe("a container", () => {
    it("carries its body and validates its parameters", () => {
      const [stack] = parseMarkdownShortcodes(
        '[[vstack alignment="trailing" spacing=24 { Inhalt }]]',
      );

      expect(stack.token).toBe(MARKDOWN_SHORTCODE_TOKENS.vstack);
      expect(stack.params.alignment).toBe("trailing");
      expect(stack.params.spacing).toBe(24);
      expect(stack.body).toBe("Inhalt ");
      expect(stack.issues).toEqual([]);
    });

    it("falls back to the alignment each stack is given without one", () => {
      const [vertical] = parseMarkdownShortcodes("[[vstack { a }]]");
      const [horizontal] = parseMarkdownShortcodes("[[hstack { a }]]");

      expect(vertical.params.alignment).toBe("leading");
      expect(horizontal.params.alignment).toBe("center");
    });

    it("rejects an alignment belonging to the other axis", () => {
      const [stack] = parseMarkdownShortcodes('[[vstack alignment="top" { a }]]');

      expect(stack.issues).toContainEqual({
        code: "invalid-param",
        message: 'Shortcode parameter "alignment" is invalid.',
        attribute: "alignment",
      });
      expect(stack.params.alignment).toBe("leading");
    });

    it("reports a container written without a body", () => {
      const [stack] = parseMarkdownShortcodes("[[vstack]]");

      expect(stack.issues).toContainEqual({
        code: "missing-body",
        message: 'Shortcode "vstack" needs a body in braces.',
      });
    });

    it("reports a body on a shortcode that draws one thing", () => {
      const [icon] = parseMarkdownShortcodes('[[icon name="heart" { Text }]]');

      expect(icon.issues).toContainEqual({
        code: "body-forbidden",
        message: 'Shortcode "icon" does not take a body.',
      });
    });
  });
});
