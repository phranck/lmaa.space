/**
 * Figures the settings own, written into a text as a name.
 *
 * Somebody writing a page has no way to name a number that lives in the
 * dashboard, so every sentence quoting one has to be found and edited by hand
 * when it moves. A variable is written once and follows.
 *
 * The braces are the notation `expandTextTokens` already uses for `{nbsp}` and
 * its siblings, so an editor learns one syntax rather than two. Anything not
 * named here is left standing, which is what lets both expanders run over the
 * same text without treating each other's tokens as mistakes.
 */

/** Months in a year, which is what the monthly figure is divided by. */
const MONTHS_PER_YEAR = 12;

/** Weeks in a year, for the rung that covers one. */
const WEEKS_PER_YEAR = 52;

/** Quarters in a year, for the rung that covers one. */
const QUARTERS_PER_YEAR = 4;

/**
 * The step a suggested amount is rounded to, above the threshold below.
 *
 * Five, because a ladder of 5, 20, 60 reads as chosen and one of 4.33, 18.75,
 * 56.25 reads as a leftover from a calculation.
 */
const AMOUNT_STEP_EUR = 5;

/** Under this, the step is a whole euro, so a small rung is not lifted to five. */
const AMOUNT_STEP_THRESHOLD_EUR = 5;

/**
 * Rounds a derived amount to something a person would choose.
 *
 * Rounded **up**, never to the nearest. A rung says it covers a period, and it
 * has to actually cover it: at 225 euro a year a quarter costs 56.25, so a rung
 * of 55 would have claimed a quarter whilst paying for 89 of its 91 days. That
 * had happened, and rounding down is how it happens again.
 *
 * @param cents - The exact derived amount, in cents.
 * @returns The amount in whole euro, at or above the exact figure.
 */
export function roundSuggestedAmountEur(cents: number): number {
  const euros = cents / 100;
  if (euros <= 0) return 0;
  if (euros < AMOUNT_STEP_THRESHOLD_EUR) return Math.ceil(euros);
  return Math.ceil(euros / AMOUNT_STEP_EUR) * AMOUNT_STEP_EUR;
}

/**
 * What every variable is called and what it says.
 *
 * The description is what the dashboard shows an editor looking for the name,
 * so it is written for them rather than for whoever implements it.
 */
export const SITE_VARIABLES = {
  annualCost: {
    label: "Laufende Kosten eines Jahres, wie unter Sponsoring eingetragen",
    example: "180,00 €",
  },
  monthlyCost: {
    label: "Dieselben Kosten auf einen Monat gerechnet",
    example: "15,00 €",
  },
  amountWeek: {
    label: "Betrag für eine Woche, gerundet und ohne Währung, für einen Spendenbetrag",
    example: "5",
  },
  amountMonth: {
    label: "Betrag für einen Monat, gerundet und ohne Währung, für einen Spendenbetrag",
    example: "20",
  },
  amountQuarter: {
    label: "Betrag für ein Vierteljahr, gerundet und ohne Währung, für einen Spendenbetrag",
    example: "60",
  },
  amountYear: {
    label: "Betrag für ein ganzes Jahr, gerundet und ohne Währung, für einen Spendenbetrag",
    example: "225",
  },
  amountMonthHalf: {
    label: "Halber Monatsbetrag, gerundet und ohne Währung, für einen Spendenbetrag",
    example: "10",
  },
  amountMonthQuarter: {
    label: "Viertel des Monatsbetrags, gerundet und ohne Währung, für einen Spendenbetrag",
    example: "5",
  },
  peoplePerYear: {
    label: "Wie viele Menschen mit je einem Monatsbetrag ein ganzes Jahr tragen",
    example: "12",
  },
  payeeName: {
    label: "Empfänger der Überweisung, wie unter Sponsoring eingetragen",
    example: "Frank Gregor",
  },
  payeeIban: {
    label: "IBAN des Empfängers, in Vierergruppen",
    example: "AT55 1900 1047 0466 6811",
  },
  payeeBic: {
    label: "BIC des Empfängers",
    example: "TRBKATW2XXX",
  },
} as const satisfies Record<string, { label: string; example: string }>;

/** Name of one variable. */
export type SiteVariableName = keyof typeof SITE_VARIABLES;

/** Every variable, in declaration order. */
export const SITE_VARIABLE_NAMES = Object.keys(SITE_VARIABLES) as SiteVariableName[];

/** What a text may name, as the settings hold it. */
export interface SiteVariableValues {
  /** What the year costs, being the sum of the items set in the dashboard. */
  annualCostCents: number;
  /** Who is paid. Empty until somebody is entered. */
  payeeName: string;
  /** The account, without its printed spaces, as it is stored. */
  payeeIban: string;
  /** The bank, or empty for a payee inside the EEA who names none. */
  payeeBic: string;
}

/** Four at a time, which is how an IBAN is printed and read back. */
function groupIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/** Only the names above, so an unrelated `{word}` is never touched. */
const VARIABLE_PATTERN = new RegExp(`\\{(${SITE_VARIABLE_NAMES.join("|")})\\}`, "g");

/**
 * Puts the figures in place of their names.
 *
 * @param text - What was written, with or without variables in it.
 * @param values - The figures as the settings hold them, in cents.
 * @param formatMoney - Turns cents into money the way the surface writes it.
 *   Passed in rather than chosen here, because a formatter is built once by
 *   whoever owns the locale and this runs per rendered text.
 * @returns The text with every known variable replaced. Anything else stands.
 */
export function expandSiteVariables(
  text: string,
  values: SiteVariableValues,
  formatMoney: (cents: number) => string,
): string {
  if (!text.includes("{")) return text;

  return text.replace(VARIABLE_PATTERN, (_match, name: SiteVariableName) => {
    switch (name) {
      case "annualCost":
        return formatMoney(values.annualCostCents);
      case "monthlyCost":
        // Rounded to the cent, because a third of a cent is not money and the
        // figure is read rather than added up.
        return formatMoney(Math.round(values.annualCostCents / MONTHS_PER_YEAR));
      // The six below render a bare number rather than money, because they are
      // written into a shortcode's `amount=` and read back with parseFloat.
      case "amountWeek":
        return String(roundSuggestedAmountEur(values.annualCostCents / WEEKS_PER_YEAR));
      case "amountMonth":
        return String(roundSuggestedAmountEur(values.annualCostCents / MONTHS_PER_YEAR));
      case "amountQuarter":
        return String(roundSuggestedAmountEur(values.annualCostCents / QUARTERS_PER_YEAR));
      case "amountYear":
        return String(roundSuggestedAmountEur(values.annualCostCents));
      case "amountMonthHalf":
        return String(roundSuggestedAmountEur(values.annualCostCents / MONTHS_PER_YEAR / 2));
      case "amountMonthQuarter":
        return String(roundSuggestedAmountEur(values.annualCostCents / MONTHS_PER_YEAR / 4));
      // How many people at one monthly rung carry the year. Derived from the
      // rounded rung rather than from the exact twelfth, because the sentence
      // that quotes it also quotes the rung, and the two have to agree.
      case "peoplePerYear": {
        const rung = roundSuggestedAmountEur(values.annualCostCents / MONTHS_PER_YEAR);
        if (rung <= 0) return "0";
        return String(Math.ceil(values.annualCostCents / 100 / rung));
      }
      case "payeeName":
        return values.payeeName;
      case "payeeIban":
        // Printed the way a banking app shows it, because somebody is going to
        // compare the two character by character.
        return groupIban(values.payeeIban);
      case "payeeBic":
        return values.payeeBic;
    }
  });
}
