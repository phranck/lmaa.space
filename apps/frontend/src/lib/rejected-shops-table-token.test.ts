import { describe, expect, it } from "vitest";

import { parseRejectedShopsTableTokens } from "./rejected-shops-table-token";

describe("parseRejectedShopsTableTokens", () => {
  it("splits markdown content around rejected shops table tokens", () => {
    expect(
      parseRejectedShopsTableTokens(
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
    expect(parseRejectedShopsTableTokens("[[rejected-shops-table pageSize=999]]")).toEqual([
      {
        type: "rejected-shops-table",
        defaultPageSize: "15",
        storageKey: "default-0",
      },
    ]);
  });
});
