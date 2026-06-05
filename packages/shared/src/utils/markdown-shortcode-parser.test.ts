import { describe, expect, it } from "vitest";

import { MARKDOWN_SHORTCODE_TOKENS } from "../markdown-shortcodes.js";
import { parseMarkdownShortcodes } from "./markdown-shortcode-parser.js";

describe("parseMarkdownShortcodes", () => {
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
    const [token] = parseMarkdownShortcodes("[[widget:promo featured title='Promo']]");

    expect(token?.rawAttributes).toContainEqual({
      name: "featured",
      value: true,
      raw: "featured",
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
});
