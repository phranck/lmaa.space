import { describe, expect, it } from "vitest";

import { countryName } from "./country-name.js";

describe("countryName", () => {
  it("names the country in German unless asked otherwise", () => {
    expect(countryName("DE")).toBe("Deutschland");
    expect(countryName("AT")).toBe("Österreich");
    expect(countryName("DE", "en")).toBe("Germany");
  });

  it("gives an unrecognised but well-formed code back", () => {
    expect(countryName("XX")).toBe("XX");
  });

  it("gives a malformed code back rather than throwing", () => {
    expect(countryName("germany")).toBe("germany");
    expect(countryName("D")).toBe("D");
  });

  it("gives nothing back for an empty code", () => {
    expect(countryName("")).toBe("");
  });
});
