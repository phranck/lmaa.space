import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiGetInternal: vi.fn() }));

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
 * Answers the calls the renderer makes, in whatever order they arrive.
 *
 * The account comes through the website-internal route rather than the public
 * one, so both have to answer before any figure reaches the text.
 *
 * @param costsTotalCents - What the settings say a year costs.
 * @param received - What the ledger has over the year and over the month, in
 *   cents. Nothing by default, which is the state a new site is in.
 */
function backendAnswers(
  costsTotalCents: number,
  received: { coveredCents: number; donatedMonthCents: number } = {
    coveredCents: 0,
    donatedMonthCents: 0,
  },
) {
  apiMocks.apiGet.mockImplementation(async (path: string) => {
    if (path === "/sponsors") return { costsTotalCents, ...received };
    return {};
  });
  apiMocks.apiGetInternal.mockResolvedValue({
    payeeName: "",
    payeeIban: "",
    payeeBic: "",
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

  it("writes what came in and what is still missing", async () => {
    backendAnswers(22_600, { coveredCents: 9_000, donatedMonthCents: 1_500 });
    const render = await freshRenderer();

    const html = await render("{donatedYear} kam rein, {donatedMonth} davon zuletzt.");

    expect(html).toContain("90,00");
    expect(html).toContain("15,00");
  });

  it("subtracts what came in from the year's costs", async () => {
    backendAnswers(22_600, { coveredCents: 9_000, donatedMonthCents: 1_500 });
    const render = await freshRenderer();

    const html = await render("Es fehlen noch {missingYear}.");

    expect(html).toContain("136,00");
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
    apiMocks.apiGetInternal.mockRejectedValue(new Error("backend down"));
    const render = await freshRenderer();

    const html = await render("Ein Jahr kostet {annualCost}.");

    expect(html).toContain("{annualCost}");
  });

  it("keeps what it last read when the backend stops answering", async () => {
    backendAnswers(22_600);
    const render = await freshRenderer();
    await render("{annualCost}");

    apiMocks.apiGet.mockRejectedValue(new Error("backend down"));
    apiMocks.apiGetInternal.mockRejectedValue(new Error("backend down"));
    const html = await render("Ein Jahr kostet {annualCost}.");

    // A figure a minute old beats a gap where a number belongs.
    expect(html).toContain("226,00");
  });
});
