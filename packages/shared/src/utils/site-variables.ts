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
