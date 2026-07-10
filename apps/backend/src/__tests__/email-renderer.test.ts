import { describe, expect, it } from "vitest";

import type { EmailTemplate } from "../db/schema.js";
import {
  renderEmailPreview,
  renderEmailTemplate,
  sampleVariablesForTemplate,
} from "../services/email-renderer.js";

const template: EmailTemplate = {
  id: 1,
  name: "test",
  subject: "Hallo {{name}}",
  headerBannerUrl: null,
  headerText: null,
  bodyText: "Hallo **{{name}}**",
  footerBannerUrl: null,
  footerText: "Footer",
  isSystemTemplate: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("email renderer", () => {
  it("declares dark mode support for real emails", async () => {
    const { html, subject } = await renderEmailTemplate(template, { name: "Ada" });

    expect(subject).toBe("Hallo Ada");
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain('<meta name="supported-color-schemes" content="light dark">');
    expect(html).toContain("color-scheme: light dark;");
    expect(html).toContain("@media (prefers-color-scheme: dark)");
  });

  it("renders dark preview styles without a media query", () => {
    const html = renderEmailPreview({ bodyText: "Hallo" }, "dark");

    expect(html).toContain("color-scheme: light dark;");
    expect(html).toContain("background-color: #1c1917 !important");
    expect(html).not.toContain("@media (prefers-color-scheme: dark)");
  });

  it("never turns user-supplied variables into links (markdown + GFM autolink)", async () => {
    const { html } = await renderEmailTemplate(
      { ...template, bodyText: "Shop: {{name}}" },
      { name: "visit https://evil.example or [x](https://evil.example) now" },
    );
    // No anchor may be generated from the user value — neither via markdown link
    // syntax nor via GFM autolinking of the bare URL.
    expect(html).not.toContain("<a ");
    expect(html).not.toContain('href="https://evil.example"');
    // ...but the value is still present as inert escaped text.
    expect(html).toContain("https://evil.example");
  });

  it("still renders markdown authored in the template itself", async () => {
    const { html } = await renderEmailTemplate(
      { ...template, bodyText: "**bold** {{name}}" },
      {
        name: "Ada",
      },
    );
    expect(html).toContain("<strong");
    expect(html).toContain("Ada");
  });

  it("substitutes variables used as Markdown link URLs (href)", async () => {
    const { html } = await renderEmailTemplate(
      { ...template, bodyText: "[Dashboard]({{dashboardUrl}})" },
      { dashboardUrl: "https://example.com/dashboard" },
    );
    expect(html).toContain('href="https://example.com/dashboard"');
    expect(html).toContain(">Dashboard</a>");
  });

  it("substitutes variables used as Markdown link URLs when text also contains a variable", async () => {
    const { html } = await renderEmailTemplate(
      { ...template, bodyText: "[{{shopName}}]({{shopUrl}})" },
      { shopName: "Alrighty", shopUrl: "https://alrighty.coffee/" },
    );
    expect(html).toContain('href="https://alrighty.coffee/"');
    expect(html).toContain(">Alrighty</a>");
  });

  it("resolves multiple Markdown links with different URL variables", async () => {
    const { html } = await renderEmailTemplate(
      {
        ...template,
        bodyText: "Shop: [{{shopName}}]({{shopUrl}})\n\nIm [Dashboard]({{dashboardUrl}}) prüfen.",
      },
      {
        shopName: "Alrighty",
        shopUrl: "https://alrighty.coffee/",
        dashboardUrl: "https://lmaa.space/dashboard/submissions/42",
      },
    );
    expect(html).toContain('href="https://alrighty.coffee/"');
    expect(html).toContain(">Alrighty</a>");
    expect(html).toContain('href="https://lmaa.space/dashboard/submissions/42"');
    expect(html).toContain(">Dashboard</a>");
  });

  it("substitutes link URL variables regardless of variable order", async () => {
    const { html } = await renderEmailTemplate(
      { ...template, bodyText: "[Link]({{b}}) and then [Link]({{a}})" },
      { a: "https://first.example", b: "https://second.example" },
    );
    expect(html).toContain('href="https://first.example"');
    expect(html).toContain('href="https://second.example"');
  });
});

describe("sampleVariablesForTemplate", () => {
  it("fills known variables with sample values and unknown ones with their name", () => {
    const vars = sampleVariablesForTemplate({
      ...template,
      subject: 'Vorschlag "{{shopName}}"',
      headerText: "Hallo {{username}}",
      bodyText: "{{shopUrl}} und {{customThing}}",
      footerText: null,
    });

    expect(vars).toEqual({
      shopName: "Beispiel-Shop",
      username: "maxmustermann",
      shopUrl: "https://beispiel-shop.de",
      customThing: "customThing",
    });
  });

  it("returns an empty map when the template has no placeholders", () => {
    const vars = sampleVariablesForTemplate({
      ...template,
      subject: "Statisch",
      headerText: null,
      bodyText: "Kein Platzhalter hier.",
      footerText: null,
    });

    expect(vars).toEqual({});
  });
});
