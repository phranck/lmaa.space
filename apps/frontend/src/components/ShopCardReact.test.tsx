import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ShopCardReact from "@/components/ShopCardReact";

/**
 * The card as the island renders it.
 *
 * Rendered to markup rather than driven, because what is being checked is what
 * the card decides to draw from its own props, which is settled before any
 * interaction.
 */
function render(props: Partial<Parameters<typeof ShopCardReact>[0]> = {}): string {
  return renderToStaticMarkup(
    createElement(ShopCardReact, {
      shopId: 1,
      name: "3dk.berlin",
      url: "https://3dk.berlin",
      detailHref: "/shop/abc",
      ...props,
    }),
  );
}

describe("ShopCardReact", () => {
  it("names how many people kept the shop", () => {
    const html = render({ likeCount: 7 });

    expect(html).toContain(">7<");
    expect(html).toContain("aria-label=\"7 mal gemerkt\"");
  });

  it("says nothing where nobody kept it", () => {
    // Zero is not a figure worth drawing: an empty count reads as a shop that
    // failed rather than one that is simply new.
    const html = render({ likeCount: 0 });

    expect(html).not.toContain("mal gemerkt");
  });

  it("writes the one in the singular", () => {
    const html = render({ likeCount: 1 });

    expect(html).toContain("aria-label=\"1 mal gemerkt\"");
  });

  it("draws no count where the card was given none", () => {
    // A caller that knows nothing about counts must not make the card claim
    // zero, which is a different statement from having no figure.
    const html = render();

    expect(html).not.toContain("mal gemerkt");
  });
});
