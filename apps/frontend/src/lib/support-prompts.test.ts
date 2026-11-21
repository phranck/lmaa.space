import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("./api", () => apiMocks);

const markdownMocks = vi.hoisted(() => ({
  renderMarkdownSSR: vi.fn(async (source: string) => `<p>${source}</p>`),
}));
vi.mock("./markdown-ssr", () => markdownMocks);

import { choosePrompt, countShopView, parseStore } from "./support-prompt-store";
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

  it("answers with nothing when the backend cannot be reached", async () => {
    apiMocks.apiGet.mockRejectedValueOnce(new Error("backend down"));

    const data = await loadSupportPrompts("my-shops");

    expect(data.prompts).toEqual([]);
  });

  it.each([
    ["an unavailable backend", undefined, 0],
    ["a temporarily unpublished prompt", { prompts: [], limits: {} }, 3],
  ] as const)("keeps settled history through %s", async (_scenario, payload, dismissed) => {
    const record = { shown: 1, dismissed, resolved: true };
    const stored = JSON.stringify({ shown: 1, prompts: { b: record } });
    if (payload) apiMocks.apiGet.mockResolvedValueOnce(payload);
    else apiMocks.apiGet.mockRejectedValueOnce(new Error("backend down"));

    const unavailable = await loadSupportPrompts("shop-detail");
    expect(unavailable.prompts).toEqual([]);
    // Shop detail still persists visit progress while there is nothing to show.
    const visited = countShopView(parseStore(stored), "eine-werkstatt");
    const restored = await loadSupportPrompts("shop-detail");
    expect(restored.prompts.map(({ id }) => id)).toEqual(["b"]);

    const reloaded = parseStore(JSON.stringify(visited));
    expect(reloaded.prompts.b).toEqual(record);
    expect(
      choosePrompt(restored.prompts, reloaded, restored.limits, { liked: 0, viewed: 1 }, 0),
    ).toBeNull();
  });
});
