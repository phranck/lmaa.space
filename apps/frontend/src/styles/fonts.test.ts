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
    const fontStylesPath = resolve(frontendRoot, "src/assets/fonts/fonts.css");
    const globalStyles = read("src/styles/global.css");
    const layout = read("src/layouts/BaseLayout.astro");
    const tokens = read("../../packages/shared/styles/tokens.css");

    expect(existsSync(fontStylesPath)).toBe(true);
    expect(globalStyles).toContain('@import "../assets/fonts/fonts.css";');
    expect(layout).not.toContain('href="/fonts/fonts.css"');
    expect(layout).not.toMatch(/href="\/fonts\/[^"]+\.woff2"/);
    expect(layout).toContain("criticalFontPreloads.map");
    expect(tokens).toContain('--ds-font-sans: "Barlow", system-ui, -apple-system, sans-serif;');

    if (!existsSync(fontStylesPath)) return;

    const fontStyles = read("src/assets/fonts/fonts.css");
    // Every file in the folder is declared, and every declared file is in the
    // folder, so the folder is the one list of what the site ships.
    const expectedFontAssets = readdirSync(resolve(frontendRoot, "src/assets/fonts")).filter(
      (name) => name.endsWith(".woff2"),
    );
    const declaredFontAssets = [...fontStyles.matchAll(/url\("\.\/([\w-]+\.woff2)"\)/g)].map(
      (match) => match[1],
    );
    expect([...declaredFontAssets].sort()).toEqual([...expectedFontAssets].sort());
    expect(fontStyles).not.toMatch(/url\(["']?\/fonts\//);

    // A display face waits for its file rather than painting a fallback, and
    // the layout preloads only display cuts, so a preload always shortens a
    // wait the reader would otherwise see.
    const displayFaceBlocks = (fontStyles.match(/@font-face\s*{[^}]+}/g) ?? []).filter((block) =>
      /font-family: "Barlow Condensed"/.test(block),
    );
    for (const face of displayFaceBlocks) {
      expect(face).toContain("font-display: block;");
    }
    // The layout preloads what every page shows, and a page adds its own.
    const sourceRoot = resolve(frontendRoot, "src");
    const preloads = readdirSync(sourceRoot, { recursive: true })
      .filter((path): path is string => typeof path === "string" && path.endsWith(".astro"))
      .flatMap((path) => [
        ...readFileSync(resolve(sourceRoot, path), "utf8").matchAll(
          /@\/assets\/fonts\/([\w-]+\.woff2)\?url/g,
        ),
      ])
      .map((match) => match[1]);
    expect(preloads.length).toBeGreaterThan(0);
    for (const preload of preloads) {
      const face = displayFaceBlocks.find((block) => block.includes(`url("./${preload}")`));
      expect(face, preload).toBeDefined();
    }
  });
});
