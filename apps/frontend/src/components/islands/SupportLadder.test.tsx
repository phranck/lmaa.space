import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SPONSOR_FORM_DEFAULTS } from "@lmaa/shared";

import SupportLadder from "@/components/islands/SupportLadder";
import type {
  SupportLadderBankAccount,
  SupportLadderInterval,
} from "@/lib/content-shortcode-segments";

/**
 * The ladder as the server sends it, before any browser is involved.
 *
 * Rendered to markup rather than driven, because what is being checked is which
 * of the tab's two shapes the page's own nodes decide on, and that is settled
 * before the first paint.
 */
function render(bankAccount: SupportLadderBankAccount, interval: SupportLadderInterval): string {
  return renderToStaticMarkup(
    createElement(SupportLadder, {
      bankAccount,
      intervals: [interval],
      routes: [],
      minSponsorAmountEur: 45,
    }),
  );
}

/** A sponsor tab with a free-amount field and a notice, as the page writes one. */
const sponsorInterval: SupportLadderInterval = {
  key: "sponsor",
  label: "Sponsor werden",
  text: "",
  hint: "Sponsor wirst du per Überweisung.",
  options: [],
  custom: { label: "Dein Beitrag", placeholder: "40", text: "Ab hier stehst du auf der Seite." },
};

/** The account, with the variant this test is about. */
function account(sponsorForm: Record<string, string> | undefined): SupportLadderBankAccount {
  return {
    beneficiaryName: "Frank Gregor",
    iban: "AT551900104704666811",
    purposeDonation: "Spende: lmaa.space",
    purposeSponsor: "Sponsor: lmaa.space",
    variants: [
      {
        key: "sponsor",
        title: "Sponsoren-Überweisung",
        text: "Erst absenden.",
        recommended: false,
        info: "Vergleich die Daten mit deiner Banking-App.",
        sponsorForm: sponsorForm as SupportLadderBankAccount["variants"][number]["sponsorForm"],
      },
    ],
  };
}

describe("SupportLadder", () => {
  it("shows the form where the page's variant names one", () => {
    const html = render(account(SPONSOR_FORM_DEFAULTS), sponsorInterval);

    expect(html).toContain(`aria-label="${SPONSOR_FORM_DEFAULTS.submitLabel}"`);
    expect(html).toContain(SPONSOR_FORM_DEFAULTS.firstNameLabel);
    expect(html).toContain(SPONSOR_FORM_DEFAULTS.linkHint);
  });

  it("shows no form where the variant names none", () => {
    const html = render(account(undefined), sponsorInterval);

    expect(html).not.toContain(`aria-label="${SPONSOR_FORM_DEFAULTS.submitLabel}"`);
    expect(html).toContain("Dein Beitrag");
  });

  it("stands the amount, the form and the notice on one card", () => {
    const html = render(account(SPONSOR_FORM_DEFAULTS), sponsorInterval);
    const card = html.slice(html.indexOf("var(--ds-surface-form)"));

    // All three inside the one surface, in the order the errand runs.
    const amount = card.indexOf("Dein Beitrag");
    const form = card.indexOf(SPONSOR_FORM_DEFAULTS.firstNameLabel);
    const notice = card.indexOf("Sponsor wirst du per Überweisung");
    expect(amount).toBeGreaterThan(-1);
    expect(form).toBeGreaterThan(amount);
    expect(notice).toBeGreaterThan(form);
  });

  it("marks every field of the form as one that has to be filled in", () => {
    const html = render(account(SPONSOR_FORM_DEFAULTS), sponsorInterval);
    const form = html.slice(html.indexOf(`aria-label="${SPONSOR_FORM_DEFAULTS.submitLabel}"`));

    // Four fields, four marks: the given name, the family name, the address and
    // the sentence.
    expect(form.match(/text-\[var\(--ds-danger-text\)\]/g)?.length).toBe(4);
  });

  it("offers the floor in the empty field, not a number written into the page", () => {
    // Emptying the field hands the choice back to the floor, so a placeholder of
    // its own would suggest one amount whilst the code carried another.
    const html = render(account(SPONSOR_FORM_DEFAULTS), sponsorInterval);

    expect(html).toContain('placeholder="45"');
    expect(html).not.toContain('placeholder="40"');
  });

  it("names the sponsorship on the transfer once the amount earns one", () => {
    // The tab opens on the floor, which is exactly what a sponsorship costs.
    const html = render(account(SPONSOR_FORM_DEFAULTS), sponsorInterval);

    expect(html).toContain("Sponsor: lmaa.space");
    expect(html).not.toContain("Spende: lmaa.space");
  });

  it("falls back to an ordinary donation below the floor", () => {
    // A tab that opens on a suggested amount under the minimum. Nothing about
    // it may say sponsorship: not the words on the transfer, and not the line
    // waiting for a reference.
    const html = render(account(SPONSOR_FORM_DEFAULTS), {
      ...sponsorInterval,
      options: [{ amountEur: 5, description: "", recommended: true }],
    });

    expect(html).toContain("Spende: lmaa.space");
    expect(html).not.toContain("Sponsor: lmaa.space");
    expect(html).not.toContain("XXXX XXXX XXXX XXXX XXXX");
  });

  it("keeps the reference line in the transfer card, masked until there is one", () => {
    const html = render(account(SPONSOR_FORM_DEFAULTS), sponsorInterval);

    expect(html).toContain("XXXX XXXX XXXX XXXX XXXX");
    expect(html).toContain("var(--ds-danger-text)");
  });
});
