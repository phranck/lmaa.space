import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const frontendRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("website font delivery", () => {
  it("does not reference the retired public font path from frontend source files", () => {
    const sourceRoot = resolve(frontendRoot, "src");
    const sourceFiles = readdirSync(sourceRoot, { recursive: true }).filter(
      (path): path is string =>
        typeof path === "string" &&
        /\.(?:astro|css|ts|tsx)$/.test(path) &&
        !path.endsWith(".test.ts") &&
        !path.endsWith(".test.tsx"),
    );

    for (const sourceFile of sourceFiles) {
      const source = readFileSync(resolve(sourceRoot, sourceFile), "utf8");
      expect(source, sourceFile).not.toMatch(/(?:href=|url\()\s*["']?\/fonts\//);
    }
  });

  it("routes font declarations, binaries, and critical preloads through the Vite asset pipeline", () => {
    const fontStylesPath = resolve(frontendRoot, "src/styles/fonts.css");
    const globalStyles = read("src/styles/global.css");
    const layout = read("src/layouts/BaseLayout.astro");
    const tokens = read("../../packages/shared/styles/tokens.css");

    expect(existsSync(fontStylesPath)).toBe(true);
    expect(globalStyles).toContain('@import "./fonts.css";');
    expect(layout).not.toContain('href="/fonts/fonts.css"');
    expect(layout).not.toMatch(/href="\/fonts\/[^\"]+\.woff2"/);
    expect(layout).toContain("criticalFontPreloads.map");
    expect(tokens).toContain('--ds-font-sans: "Barlow", system-ui, -apple-system, sans-serif;');

    if (!existsSync(fontStylesPath)) return;

    const fontStyles = read("src/styles/fonts.css");
    const expectedFontAssets = [
      "barlow-400-italic-latin-ext.woff2",
      "barlow-400-italic-latin.woff2",
      "barlow-400-latin-ext.woff2",
      "barlow-400-latin.woff2",
      "barlow-500-italic-latin-ext.woff2",
      "barlow-500-italic-latin.woff2",
      "barlow-500-latin-ext.woff2",
      "barlow-500-latin.woff2",
      "barlow-600-italic-latin-ext.woff2",
      "barlow-600-italic-latin.woff2",
      "barlow-600-latin-ext.woff2",
      "barlow-600-latin.woff2",
      "barlow-condensed-400.woff2",
      "barlow-condensed-500.woff2",
      "barlow-condensed-600.woff2",
      "barlow-condensed-700.woff2",
      "barlow-condensed-800.woff2",
      "dynapuff-500.woff2",
      "dynapuff-600.woff2",
    ];

    expect(fontStyles).not.toMatch(/url\(["']?\/fonts\//);
    for (const asset of expectedFontAssets) {
      expect(fontStyles).toContain(`url("../assets/fonts/${asset}")`);
    }

    for (const asset of [
      "barlow-condensed-400.woff2",
      "barlow-condensed-600.woff2",
      "barlow-condensed-700.woff2",
      "dynapuff-500.woff2",
    ]) {
      expect(layout).toContain(`@/assets/fonts/${asset}?url`);
    }

    const displayFaceBlocks = fontStyles.match(/@font-face\s*{[^}]+}/g) ?? [];
    const criticalDisplayFaces = displayFaceBlocks.filter((block) =>
      /font-family: "(?:Barlow Condensed|DynaPuff)"/.test(block),
    );
    expect(criticalDisplayFaces).toHaveLength(7);
    for (const face of criticalDisplayFaces) {
      expect(face).toContain("font-display: block;");
    }
  });
});
