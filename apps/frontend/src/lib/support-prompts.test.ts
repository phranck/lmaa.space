import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("./api", () => apiMocks);

const markdownMocks = vi.hoisted(() => ({
  renderMarkdownSSR: vi.fn(async (source: string) => `<p>${source}</p>`),
}));
vi.mock("./markdown-ssr", () => markdownMocks);

import { loadSupportPrompts } from "./support-prompts";

/** One prompt as the backend sends it, with only the fields under test set. */
function prompt(id: string, slot: string) {
  return {
    id,
    name: `Name of ${id}`,
    slot,
    content: id,
    buttonLabel: "",
    buttonHref: "",
    buttonAlignment: "trailing",
    threshold: 0,
    thresholdBasis: "viewed",
    priority: 0,
  };
}

describe("loadSupportPrompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.apiGet.mockResolvedValue({
      prompts: [
        prompt("a", "my-shops"),
        prompt("b", "shop-detail"),
        prompt("c", "category-grid"),
        prompt("d", "my-shops"),
      ],
      limits: { maxShown: 4, snoozeDays: 14 },
    });
  });

  it("renders only the prompts for the slot that asked", async () => {
    const data = await loadSupportPrompts("my-shops");

    expect(data.prompts.map((entry) => entry.id)).toEqual(["a", "d"]);
    expect(markdownMocks.renderMarkdownSSR).toHaveBeenCalledTimes(2);
  });

  it("renders through the pipeline that puts the figures in place of their names", async () => {
    // A prompt quotes what a check costs and what the year costs, the same way
    // a page does. Rendered through the plain Markdown renderer instead, those
    // names reach the reader as `{reviewCost}` and `{annualCost}`.
    await loadSupportPrompts("my-shops");

    expect(markdownMocks.renderMarkdownSSR).toHaveBeenCalledWith("a", { breaks: true });
  });

  it("names every live prompt, not only the ones for this slot", async () => {
    // The reader's store keeps a record per prompt and forgets the ones that no
    // longer exist. Told only about this slot's prompts it would forget the
    // other slots' records, and somebody who dismissed a prompt on one page
    // would meet it again after visiting another.
    const data = await loadSupportPrompts("my-shops");

    expect(data.liveIds).toEqual(["a", "b", "c", "d"]);
  });

  it("answers with nothing when the backend cannot be reached", async () => {
    apiMocks.apiGet.mockRejectedValue(new Error("backend down"));

    const data = await loadSupportPrompts("my-shops");

    expect(data.prompts).toEqual([]);
    expect(data.liveIds).toEqual([]);
  });
});
