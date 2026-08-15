import { describe, expect, it } from "vitest";

import { reportProgress } from "../services/review/anthropic-provider.js";

function stepFor(block: unknown): string | null {
  let step: string | null = null;
  reportProgress((value) => {
    step = value;
  })(block as Parameters<ReturnType<typeof reportProgress>>[0]);
  return step;
}

describe("reportProgress", () => {
  it("names the search a run is about to make", () => {
    const step = stepFor({
      type: "server_tool_use",
      name: "web_search",
      input: { query: "recolution Impressum" },
    });
    expect(step).toBe('Sucht nach „recolution Impressum"');
  });

  it("names the host a run is about to read", () => {
    const step = stepFor({
      type: "server_tool_use",
      name: "web_fetch",
      input: { url: "https://www.recolution.de/impressum" },
    });
    expect(step).toBe("Liest www.recolution.de");
  });

  it("names the geocoding step", () => {
    const step = stepFor({ type: "tool_use", name: "geocode", input: { city: "Hamburg" } });
    expect(step).toBe("Prüft die Adresse");
  });

  it("names the filtering the search tools do through code execution", () => {
    expect(stepFor({ type: "server_tool_use", name: "code_execution", input: {} })).toBe(
      "Wertet die Fundstellen aus",
    );
    expect(stepFor({ type: "server_tool_use", name: "bash_code_execution", input: {} })).toBe(
      "Wertet die Fundstellen aus",
    );
    expect(
      stepFor({ type: "server_tool_use", name: "text_editor_code_execution", input: {} }),
    ).toBe("Bereitet die Fundstellen auf");
  });

  it("reports thinking", () => {
    expect(stepFor({ type: "thinking", thinking: "…" })).toBe("Denkt nach");
  });

  it("stays silent about blocks that say nothing about progress", () => {
    expect(stepFor({ type: "text", text: "…" })).toBeNull();
  });
});
