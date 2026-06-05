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
});
