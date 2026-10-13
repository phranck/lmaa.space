/**
 * Puts the visitor's theme on the page before its first paint.
 *
 * Not imported by any page. `astro.config.mjs` bundles this file into one
 * classic script and hands it to Astro as a `head-inline` script, which Astro
 * writes into the head of every page after the stylesheets and hashes into the
 * policy's `script-src`. The import is relative because that bundle is built
 * by esbuild alone, outside Vite and its `@` alias.
 */
import { applyThemeChoice, readThemeChoice } from "../lib/theme";

applyThemeChoice(readThemeChoice());
