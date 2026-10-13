import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const layout = readFileSync(fileURLToPath(new URL("./BaseLayout.astro", import.meta.url)), "utf8");
const [, frontmatter, template] = layout.split(/^---$/m);

describe("BaseLayout", () => {
  // The dev server serves a stylesheet that the frontmatter imports in the
  // head, and one that a script imports only after that script has run, which
  // is after the first paint. The page then shows without its theme until it
  // arrives. The build links both kinds in the head, so only the dev server
  // shows the difference.
  it("imports the theme's stylesheet in the frontmatter, not from a script", () => {
    expect(frontmatter).toContain('import "@/styles/global.css";');
    for (const script of template.match(/<script[\s\S]*?<\/script>/g) ?? []) {
      expect(script).not.toContain("global.css");
    }
  });
});
