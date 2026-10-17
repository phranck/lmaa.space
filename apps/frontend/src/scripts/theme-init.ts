/**
 * Puts the visitor's theme on the page before its first paint.
 *
 * Not imported by any page. `astro.config.mjs` bundles this file into one
 * classic script and hands it to Astro as a `head-inline` script, which Astro
 * writes into the head of every page after the stylesheets and hashes into the
 * policy's `script-src`. The import is relative because that bundle is built
 * by esbuild alone, outside Vite and its `@` alias.
 *
 * Only a page whose root carries `data-theme-choice`, which `BaseLayout.astro`
 * sets, takes the theme. The dashboard frames the footer's preview page, which
 * has no such root, and shows there the colors the footer is configured with
 * rather than the visitor's theme.
 */
import { applyThemeChoice, readThemeChoice } from "../lib/theme";

if (document.documentElement.hasAttribute("data-theme-choice")) {
  applyThemeChoice(readThemeChoice());
}
