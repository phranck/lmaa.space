import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock("./api", () => apiMocks);

/**
 * A renderer with an empty cache.
 *
 * The figures and the aliases are held for a minute in module scope, so every
 * test takes its own copy of the module rather than inheriting what the one
 * before it read.
 */
async function freshRenderer() {
  vi.resetModules();
  const module = await import("./markdown-ssr");
  return module.renderMarkdownSSR;
}

/**
 * Answers the two calls the renderer makes, in whatever order they arrive.
 *
 * @param costsTotalCents - What the settings say a year costs.
 */
function backendAnswers(costsTotalCents: number) {
  apiMocks.apiGet.mockImplementation(async (path: string) => {
    if (path === "/sponsors") return { costsTotalCents };
    return {};
  });
}

describe("renderMarkdownSSR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes the figures from the settings into the text", async () => {
    backendAnswers(22_600);
    const render = await freshRenderer();

    const html = await render("Ein Jahr kostet {annualCost}.");

    // Austrian formatting, the way the ladder writes its own amounts.
    expect(html).toContain("226,00");
    expect(html).not.toContain("{annualCost}");
  });

  it("divides the year for the month", async () => {
    backendAnswers(22_600);
    const render = await freshRenderer();

    const html = await render("Das sind {monthlyCost} im Monat.");

    expect(html).toContain("18,83");
  });

  it("leaves a name it does not own exactly as it was", async () => {
    backendAnswers(22_600);
    const render = await freshRenderer();

    // The ladder's own placeholder is expanded later, in the browser, against
    // the amount the reader has chosen. Touching it here would eat it.
    const html = await render("Im Jahr {annualAmount}.");

    expect(html).toContain("{annualAmount}");
  });

  it("leaves the names standing rather than inventing a figure", async () => {
    // Nothing has ever been read, so there is no number to write. A wrong one
    // in a sentence about money would be worse than a visible gap.
    apiMocks.apiGet.mockRejectedValue(new Error("backend down"));
    const render = await freshRenderer();

    const html = await render("Ein Jahr kostet {annualCost}.");

    expect(html).toContain("{annualCost}");
  });

  it("keeps what it last read when the backend stops answering", async () => {
    backendAnswers(22_600);
    const render = await freshRenderer();
    await render("{annualCost}");

    apiMocks.apiGet.mockRejectedValue(new Error("backend down"));
    const html = await render("Ein Jahr kostet {annualCost}.");

    // A figure a minute old beats a gap where a number belongs.
    expect(html).toContain("226,00");
  });
});
