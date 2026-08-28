import { describe, expect, it } from "vitest";

import { fillPromptNumbers } from "./prompt-numbers";

const counts = { likedShops: 7, shopViews: 3 };

describe("fillPromptNumbers", () => {
  it("keeps the bare placeholder yielding only the number", () => {
    expect(fillPromptNumbers("<p>{shops} und {views}</p>", counts)).toBe("<p>7 und 3</p>");
  });

  it("takes the singular at one and the plural everywhere else", () => {
    const text = "<p>{shops Shop|Shops}</p>";

    expect(fillPromptNumbers(text, { ...counts, likedShops: 1 })).toBe("<p>1 Shop</p>");
    expect(fillPromptNumbers(text, { ...counts, likedShops: 2 })).toBe("<p>2 Shops</p>");
    expect(fillPromptNumbers(text, { ...counts, likedShops: 0 })).toBe("<p>0 Shops</p>");
  });

  it("fills both kinds of count in one text", () => {
    expect(
      fillPromptNumbers("<p>{shops Shop|Shops}, {views Aufruf|Aufrufe}</p>", {
        likedShops: 1,
        shopViews: 4,
      }),
    ).toBe("<p>1 Shop, 4 Aufrufe</p>");
  });

  it("keeps the forms as written, spaces and markup included", () => {
    expect(
      fillPromptNumbers("<p>{shops <em>Laden</em>|<em>Läden</em>}</p>", {
        ...counts,
        likedShops: 1,
      }),
    ).toBe("<p>1 <em>Laden</em></p>");
  });

  it("leaves a placeholder it does not know alone", () => {
    expect(fillPromptNumbers("<p>{orders Bestellung|Bestellungen}</p>", counts)).toBe(
      "<p>{orders Bestellung|Bestellungen}</p>",
    );
  });

  it("leaves a placeholder without a second form alone, rather than guessing one", () => {
    expect(fillPromptNumbers("<p>{shops Shop}</p>", counts)).toBe("<p>{shops Shop}</p>");
  });
});
