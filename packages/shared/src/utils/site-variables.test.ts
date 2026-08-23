import { describe, expect, it } from "vitest";

import {
  SITE_VARIABLE_NAMES,
  expandSiteVariables,
  type SiteVariableValues,
} from "./site-variables.js";

/** The settings, as the dashboard would hold them. */
const values: SiteVariableValues = {
  annualCostCents: 18_000,
  payeeName: "Frank Gregor",
  payeeIban: "AT551900104704666811",
  payeeBic: "TRBKATW2XXX",
};

/** Money the way the site writes it, standing in for the real formatter. */
function money(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function expand(text: string): string {
  return expandSiteVariables(text, values, money);
}

describe("expandSiteVariables", () => {
  it("puts the year's costs in place of their name", () => {
    expect(expand("Ein Jahr kostet {annualCost}.")).toBe("Ein Jahr kostet 180,00 €.");
  });

  it("divides the same figure for the month", () => {
    expect(expand("Das sind {monthlyCost} im Monat.")).toBe("Das sind 15,00 € im Monat.");
  });

  it("replaces every occurrence, not only the first", () => {
    expect(expand("{monthlyCost} und nochmal {monthlyCost}")).toBe("15,00 € und nochmal 15,00 €");
  });

  it("rounds the month to the cent", () => {
    // 100 cents over twelve months is 8.33, and a third of a cent is not money.
    expect(expandSiteVariables("{monthlyCost}", { ...values, annualCostCents: 100 }, money)).toBe(
      "0,08 €",
    );
  });

  it("writes the payee the way a transfer names them", () => {
    expect(expand("An {payeeName}, {payeeIban}, {payeeBic}.")).toBe(
      "An Frank Gregor, AT55 1900 1047 0466 6811, TRBKATW2XXX.",
    );
  });

  it("prints the account in fours, the way a banking app shows it", () => {
    // Somebody is going to compare the two character by character.
    expect(expand("{payeeIban}")).toBe("AT55 1900 1047 0466 6811");
  });

  it("leaves a name it does not know exactly as it was", () => {
    // The text tokens use the same braces, and the ladder has one of its own.
    expect(expand("{nbsp} und {annualAmount} und {wasAuchImmer}")).toBe(
      "{nbsp} und {annualAmount} und {wasAuchImmer}",
    );
  });

  it("gives back a text without variables untouched", () => {
    expect(expand("Nichts zu ersetzen.")).toBe("Nichts zu ersetzen.");
  });

  it("names every variable it knows, so the dashboard can list them", () => {
    for (const name of SITE_VARIABLE_NAMES) {
      expect(expand(`{${name}}`)).not.toContain("{");
    }
  });
});
