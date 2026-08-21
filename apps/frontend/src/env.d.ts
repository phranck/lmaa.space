/**
 * The footer's stylesheet, minified, substituted at build time.
 *
 * `astro.config.mjs` minifies `FOOTER_STYLES_CSS` once, hashes that result into
 * the style policy, and supplies it here through `vite.define`. It exists as a
 * global rather than an import because the value has to be the same string in
 * both places, and the configuration is the only place that runs before both.
 */
declare const __FOOTER_STYLES_CSS__: string;

declare namespace App {
  interface Locals {
    /**
     * A policy the route built for itself, to be sent instead of the site's.
     *
     * @remarks
     * Astro builds the policy from `astro.config.mjs` and writes it over
     * whatever a route set, so a route that needs its own has to hand it to the
     * middleware, which runs after Astro and is the last place before the
     * response. The markdown widgets are the case this exists for: each one
     * embeds a different third party and therefore needs different sources.
     */
    contentSecurityPolicy?: string;
  }
}
