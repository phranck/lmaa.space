import { describe, expect, it } from "vitest";

import {
  parseContentShortcodeSegments,
  type SupportLadderVariant,
} from "./content-shortcode-segments";

describe("parseContentShortcodeSegments", () => {
  it("splits markdown content around rejected shops table island shortcodes", () => {
    expect(
      parseContentShortcodeSegments(
        'Intro\n\n[[rejected-shops-table pageSize="30" id="transparency"]]\n\nOutro',
      ),
    ).toEqual([
      { type: "markdown", content: "Intro\n\n" },
      {
        type: "rejected-shops-table",
        defaultPageSize: "30",
        storageKey: "transparency",
      },
      { type: "markdown", content: "\n\nOutro" },
    ]);
  });

  it("falls back to a safe default page size", () => {
    expect(parseContentShortcodeSegments("[[rejected-shops-table pageSize=999]]")).toEqual([
      {
        type: "rejected-shops-table",
        defaultPageSize: "15",
        storageKey: "default-0",
      },
    ]);
  });

  it("keeps invalid target-style island shortcodes as markdown", () => {
    expect(parseContentShortcodeSegments("[[rejected-shops-table:foo]]")).toEqual([
      { type: "markdown", content: "[[rejected-shops-table:foo]]" },
    ]);
  });

  it("carries both sentences about the year's costs from the sponsors block", () => {
    expect(
      parseContentShortcodeSegments(
        '[[sponsors title="Sponsoren" covered="Alles gedeckt." missing="Es fehlen noch {missing}."]]',
      ),
    ).toEqual([
      {
        type: "sponsors",
        title: "Sponsoren",
        text: "",
        covered: "Alles gedeckt.",
        missing: "Es fehlen noch {missing}.",
      },
    ]);
  });

  it("keeps a tab that offers only a free amount", () => {
    const [segment] = parseContentShortcodeSegments(
      [
        "[[support-ladder",
        '  [[interval key="sponsor" label="Sponsor werden" hint="Ab 40 Euro." belowMinimum="Unter {min} ist es eine Spende."',
        '    [[custom label="Dein Betrag" placeholder="40"]]',
        "  ]]",
        "]]",
      ].join("\n"),
    );

    expect(segment).toMatchObject({
      type: "support-ladder",
      intervals: [
        {
          key: "sponsor",
          label: "Sponsor werden",
          hint: "Ab 40 Euro.",
          belowMinimum: "Unter {min} ist es eine Spende.",
          options: [],
          custom: { label: "Dein Betrag", placeholder: "40" },
        },
      ],
    });
  });

  it("reads both references from the account", () => {
    const [segment] = parseContentShortcodeSegments(
      [
        "[[support-ladder",
        '  [[bankaccount name="Frank Gregor" iban="AT55 1900 1047 0466 6811" purposeDonation="Spende: lmaa.space" purposeSponsor="Sponsor: lmaa.space"]]',
        '  [[interval key="once" label="Einmalig" [[option amount=5]] ]]',
        "]]",
      ].join("\n"),
    );

    expect(segment).toMatchObject({
      type: "support-ladder",
      bankAccount: {
        purposeDonation: "Spende: lmaa.space",
        purposeSponsor: "Sponsor: lmaa.space",
      },
    });
  });

  it("gives a variant the form only where the page asks for one", () => {
    const [segment] = parseContentShortcodeSegments(
      [
        "[[support-ladder",
        '  [[bankaccount name="Frank Gregor" iban="AT55 1900 1047 0466 6811"',
        '    [[variant key="once" title="Überweisung"]]',
        '    [[variant key="sponsor" title="Sponsoren-Überweisung"',
        '      [[sponsorform submitLabel="Los gehts"]]',
        "    ]]",
        "  ]]",
        '  [[interval key="once" label="Einmalig" [[option amount=5]] ]]',
        "]]",
      ].join("\n"),
    );

    const variants = (segment as { bankAccount: { variants: SupportLadderVariant[] } }).bankAccount
      .variants;
    expect(variants.find((entry) => entry.key === "once")?.sponsorForm).toBeUndefined();
    expect(variants.find((entry) => entry.key === "sponsor")?.sponsorForm).toMatchObject({
      submitLabel: "Los gehts",
      // Everything the page leaves out keeps the wording the component ships.
      firstNameLabel: "Vorname",
      claimRemaining: "noch {n} Zeichen",
    });
  });

  it("still reads a reference written under the old name", () => {
    const [segment] = parseContentShortcodeSegments(
      [
        "[[support-ladder",
        '  [[bankaccount name="Frank Gregor" iban="AT55 1900 1047 0466 6811" purpose="Spende: lmaa.space"]]',
        '  [[interval key="once" label="Einmalig" [[option amount=5]] ]]',
        "]]",
      ].join("\n"),
    );

    expect(segment).toMatchObject({
      type: "support-ladder",
      bankAccount: { purposeDonation: "Spende: lmaa.space" },
    });
  });

  it("drops a tab that offers neither an amount nor a field", () => {
    const [segment] = parseContentShortcodeSegments(
      ['[[support-ladder', '  [[interval key="sponsor" label="Sponsor werden"]]', "]]"].join("\n"),
    );

    expect(segment).toMatchObject({ type: "markdown" });
  });

  it("leaves both sentences empty when the block names neither", () => {
    expect(parseContentShortcodeSegments("[[sponsors]]")).toEqual([
      { type: "sponsors", title: "", text: "", covered: "", missing: "" },
    ]);
  });
});
