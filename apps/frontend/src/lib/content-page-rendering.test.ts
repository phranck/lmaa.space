import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiGetInternal: vi.fn() }));

vi.mock("./api", () => apiMocks);

/** A renderer whose cached figures are its own rather than the last test's. */
async function freshRenderer() {
  vi.resetModules();
  const module = await import("./content-page-rendering");
  return module.renderContentSegments;
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.apiGet.mockImplementation(async (path: string) => {
    if (path === "/sponsors") return { costsTotalCents: 22_600 };
    return {};
  });
  // The account comes through the website-internal route, which answers this
  // renderer and nobody else.
  apiMocks.apiGetInternal.mockResolvedValue({
    payeeName: "Frank Gregor",
    payeeIban: "AT551900104704666811",
    payeeBic: "TRBKATW2XXX",
  });
});

describe("renderContentSegments", () => {
  it("renders the hint of a route through the same pipeline as its text", async () => {
    // Der Hinweis wird wie jeder andere Text der Leiter geschrieben, also muss
    // er auch wie jeder andere durch den Renderer. Ohne das steht die
    // Auszeichnung als Sternchen auf der Seite.
    const render = await freshRenderer();

    const [segment] = await render(
      [
        "[[support-ladder",
        '  [[interval key="once" label="Einmalig" [[option amount=5]] ]]',
        '  [[paypalme url="https://www.paypal.com/paypalme/x" text="Praktisch."',
        '    hint="Schreib **lmaa.space** in die Notiz."]]',
        "]]",
      ].join("\n"),
    );

    const route = (segment as { routes: { token: string; hint?: string }[] }).routes.find(
      (entry) => entry.token === "paypalme",
    );
    expect(route?.hint).toContain("<strong>lmaa.space</strong>");
    expect(route?.hint).not.toContain("**");
  });

  it("expands a variable inside a shortcode's attribute", async () => {
    // The shortcodes are read from the raw page, so a variable that were only
    // expanded on render would stand in an attribute as its own name.
    const render = await freshRenderer();

    const [segment] = await render(
      [
        "[[support-ladder",
        '  [[bankaccount purposeDonation="An {payeeName}"]]',
        '  [[interval key="once" label="Einmalig" [[option amount=5]] ]]',
        "]]",
      ].join("\n"),
    );

    expect(segment).toMatchObject({
      type: "support-ladder",
      bankAccount: { purposeDonation: "An Frank Gregor" },
    });
  });

  it("expands one in the prose around them too", async () => {
    const render = await freshRenderer();

    const [segment] = await render("Ein Jahr kostet {annualCost}.");

    expect(segment).toMatchObject({ type: "html" });
    expect((segment as { html: string }).html).toContain("226,00");
  });
});
