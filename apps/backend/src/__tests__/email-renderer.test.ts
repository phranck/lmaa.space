import { describe, expect, it } from "vitest";

import type { EmailTemplate } from "../db/schema.js";
import { renderEmailPreview, renderEmailTemplate } from "../services/email-renderer.js";

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
});
