/**
 * The footer's stylesheet, minified, substituted at build time.
 *
 * `astro.config.mjs` minifies `FOOTER_STYLES_CSS` once, hashes that result into
 * the style policy, and supplies it here through `vite.define`. It exists as a
 * global rather than an import because the value has to be the same string in
 * both places, and the configuration is the only place that runs before both.
 */
declare const __FOOTER_STYLES_CSS__: string;
