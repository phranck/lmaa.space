import { describe, expect, it } from "vitest";

import {
  SITE_VARIABLE_NAMES,
  expandSiteVariables,
  roundSuggestedAmountEur,
  type SiteVariableValues,
} from "./site-variables.js";

/** The settings, as the dashboard would hold them. */
const values: SiteVariableValues = {
  annualCostCents: 18_000,
  sponsorMinimumCents: 4_500,
  payeeName: "Frank Gregor",
  payeeIban: "AT551900104704666811",
  payeeBic: "TRBKATW2XXX",
  purposeDonation: "Spende: lmaa.space",
  purposeSponsor: "Sponsor: lmaa.space",
  purposePaypal: "lmaa.space",
  donatedYearCents: 12_000,
  donatedMonthCents: 2_500,
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

  it("writes the three remittance texts exactly as they were entered", () => {
    // Nothing about them is reformatted: they are what somebody types into a
    // note or reads back against their statement.
    expect(expand("{purposeDonation}")).toBe("Spende: lmaa.space");
    expect(expand("{purposeSponsor}")).toBe("Sponsor: lmaa.space");
    expect(expand("{purposePaypal}")).toBe("lmaa.space");
  });

  it("keeps the PayPal note separate from the transfer's purpose", () => {
    // Deliberately different: the GiroCode writes its text by itself, whilst a
    // PayPal note is typed by a person on a telephone.
    expect(expand("{purposePaypal}")).not.toBe(expand("{purposeDonation}"));
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

describe("suggested amounts derived from the annual cost", () => {
  /** The figure the site actually runs on, so the numbers below are its own. */
  const real: SiteVariableValues = { ...values, annualCostCents: 22_500 };

  function derive(text: string): string {
    return expandSiteVariables(text, real, money);
  }

  it("gives a bare number, because it is written into amount=", () => {
    expect(derive("{amountMonth}")).toBe("20");
  });

  it("derives the whole ladder from one figure", () => {
    expect(derive("{amountWeek} {amountMonth} {amountQuarter} {amountYear}")).toBe("5 20 60 225");
  });

  it("splits the month for the monthly ladder", () => {
    expect(derive("{amountMonthQuarter} {amountMonthHalf} {amountMonth}")).toBe("5 10 20");
  });

  it("rounds up, so a rung covers the period it claims", () => {
    // A quarter of 225 is 56.25. Rounded down to 55 it would pay for 89 of the
    // 91 days it says it covers, which is the mistake this rule exists for.
    expect(roundSuggestedAmountEur(5_625)).toBe(60);
  });

  it("steps by one below five, so a small rung is not lifted to five", () => {
    // A month of the domain alone is 2.92, and 5 would be a different offer.
    expect(roundSuggestedAmountEur(292)).toBe(3);
  });

  it("leaves an amount that already lands on the step", () => {
    expect(roundSuggestedAmountEur(2_000)).toBe(20);
    expect(roundSuggestedAmountEur(400)).toBe(4);
  });

  it("follows the cost upwards", () => {
    const raised = { ...values, annualCostCents: 30_000 };
    expect(expandSiteVariables("{amountMonth} {amountYear}", raised, money)).toBe("25 300");
  });

  it("answers zero with zero rather than a step", () => {
    expect(roundSuggestedAmountEur(0)).toBe(0);
  });

  it("counts how many people at one rung carry the year", () => {
    // 225 at 20 a head is 11.25, and a quarter of a person does not give.
    expect(derive("{peoplePerYear}")).toBe("12");
  });

  it("counts against the rounded rung, so the sentence agrees with the ladder", () => {
    // The exact twelfth is 18.75, which would give 12 as well; the point is
    // that both numbers in "zwölf Leute mit je 20" come from the same figure.
    expect(derive("{peoplePerYear} Leute mit je {amountMonth}")).toBe("12 Leute mit je 20");
  });

  it("carries the sponsor minimum across as a whole euro", () => {
    expect(derive("{amountSponsorMin}")).toBe("45");
  });

  it("rounds a fractional minimum up, because below it is not a sponsorship", () => {
    const odd = { ...values, sponsorMinimumCents: 4_450 };
    expect(expandSiteVariables("{amountSponsorMin}", odd, money)).toBe("45");
  });

  it("does not step the minimum, because it is set rather than derived", () => {
    // 42 stays 42; only the derived rungs snap to a multiple of five.
    const odd = { ...values, sponsorMinimumCents: 4_200 };
    expect(expandSiteVariables("{amountSponsorMin}", odd, money)).toBe("42");
  });

  it("does not divide by a rung of nothing", () => {
    const nothing = { ...values, annualCostCents: 0 };
    expect(expandSiteVariables("{peoplePerYear}", nothing, money)).toBe("0");
  });
});

describe("what came in", () => {
  it("writes the year and the month as money", () => {
    expect(expand("{donatedYear} im Jahr, {donatedMonth} im Monat.")).toBe(
      "120,00 € im Jahr, 25,00 € im Monat.",
    );
  });

  it("subtracts what came in from the year's costs", () => {
    // 180 minus 120, which is the same subtraction the sponsor block writes
    // into its `missing=`.
    expect(expand("Es fehlen noch {missingYear}.")).toBe("Es fehlen noch 60,00 €.");
  });

  it("answers a covered year with nothing outstanding rather than a negative", () => {
    const surplus = { ...values, donatedYearCents: 25_000 };
    expect(expandSiteVariables("{missingYear}", surplus, money)).toBe("0,00 €");
  });

  it("counts the full costs as outstanding whilst nothing has come in", () => {
    const nothing = { ...values, donatedYearCents: 0 };
    expect(expandSiteVariables("{missingYear}", nothing, money)).toBe("180,00 €");
  });
});
