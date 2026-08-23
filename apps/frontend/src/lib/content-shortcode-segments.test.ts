import { describe, expect, it } from "vitest";

import { parseContentShortcodeSegments } from "./content-shortcode-segments";

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

  it("leaves both sentences empty when the block names neither", () => {
    expect(parseContentShortcodeSegments("[[sponsors]]")).toEqual([
      { type: "sponsors", title: "", text: "", covered: "", missing: "" },
    ]);
  });
});
