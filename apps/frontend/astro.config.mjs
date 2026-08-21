import { createHash } from "node:crypto";
import { resolve } from "node:path";

import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { transformSync } from "esbuild";
import UnoCSS from "unocss/astro";

import { FOOTER_STYLES_CSS } from "@lmaa/shared";

import {
  ANALYTICS_CSP_ORIGIN,
  STORAGE_CSP_ORIGIN,
  YOUTUBE_EMBED_CSP_ORIGIN,
} from "./src/lib/csp.js";
import { obfuscateFirstPartyChunks } from "./vite.obfuscate.js";

/**
 * The footer stylesheet, minified.
 *
 * The footer hands its CSS to `set:html`, so Astro sees a string rather than a
 * stylesheet and neither minifies it nor hashes it. It reaches every page of
 * the site with its indentation intact, which is 597 bytes each time.
 *
 * Minified here rather than in `@lmaa/shared`, because the values the template
 * carries have to be substituted before a CSS parser can read it, and here is
 * the one place that already has both the finished string and a build to do the
 * work in. Through esbuild, which is what Vite minifies the rest of the build's
 * CSS with, so there is one minifier here rather than two.
 *
 * This is the string the whole site uses. It is what `styleDirective.hashes`
 * below is computed from, and `vite.define` puts it into the footer, so the
 * hash and the stylesheet cannot come apart. Importing `FOOTER_STYLES_CSS`
 * anywhere else would publish the unminified one against this hash, and the
 * browser would refuse it.
 */
const FOOTER_STYLES_MIN_CSS = transformSync(FOOTER_STYLES_CSS, {
  loader: "css",
  minify: true,
}).code;

function devProxyPlugin() {
  return {
    name: "lmaa-dev-proxy",
    apply: "serve",
    config() {
      const backendUrl = process.env.BACKEND_URL?.trim();
      if (!backendUrl) {
        throw new Error("Missing BACKEND_URL. Define it in .env.local — manually or via pewee.");
      }
      return {
        server: {
          proxy: {
            "/api/v1": { target: backendUrl, changeOrigin: true },
            "/uploads": { target: backendUrl, changeOrigin: true },
          },
        },
      };
    },
  };
}

export default defineConfig({
  site: "https://lmaa.space",
  output: "server",
  adapter: node({ mode: "standalone" }),
  security: {
    // Astro hashes every script and style it processes and emits them in a
    // `<meta http-equiv="content-security-policy">` per page. The header set in
    // `src/middleware.ts` still carries `'unsafe-inline'`, and that is
    // deliberate: several policies on one response all have to allow a resource,
    // so the header stays permissive enough not to block Astro's hashed inline
    // scripts while the meta element supplies the restriction. Injected script
    // has no matching hash and is refused by the meta element.
    //
    // `resources` replaces Astro's default source list, so `'self'` has to be
    // named again alongside the analytics origin.
    // Astro hashes every script and style it processes and emits the policy as
    // a response header on server-rendered routes. It owns the header outright,
    // so every directive the site needs has to be configured here: whatever is
    // missing is simply absent from the response, and the middleware only fills
    // in a policy when none was set at all.
    //
    // `resources` replaces Astro's default source list rather than adding to it,
    // so `'self'` is named again next to the analytics origin.
    csp: {
      scriptDirective: {
        resources: ["'self'", ANALYTICS_CSP_ORIGIN],
      },
      styleDirective: {
        resources: [
          "'self'",
          // Inline `style="..."` attributes fall under `style-src-attr`, which
          // inherits from `style-src` when unset, so a hash-based `style-src`
          // blocks every one of them. This site passes CSS custom properties
          // that way: the footer sets `--footer-cols` for its column count and
          // `--col-span` per column, the hero sets an object-position, buttons
          // take their colour from `--accent-base`. Without this the footer
          // collapsed to a single column and buttons lost their colour.
          //
          // The concession is narrow. A style attribute cannot execute script,
          // and `script-src` stays hash-based, which is where the protection
          // against injection actually sits.
          { resource: "'unsafe-inline'", kind: "attribute" },
        ],
        // The footer injects this stylesheet through `set:html`, so Astro sees
        // dynamic content and cannot hash it. Hashing the constant here keeps
        // the two in step: changing the CSS changes the hash automatically,
        // which a hard-coded value would not. It hashes the minified string
        // because that is the one the footer receives, through `vite.define`.
        hashes: [`sha256-${createHash("sha256").update(FOOTER_STYLES_MIN_CSS).digest("base64")}`],
      },
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        `frame-src 'self' ${YOUTUBE_EMBED_CSP_ORIGIN}`,
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        `connect-src 'self' ${ANALYTICS_CSP_ORIGIN} ${STORAGE_CSP_ORIGIN}`,
        `media-src 'self' ${STORAGE_CSP_ORIGIN} blob:`,
        "form-action 'self'",
      ],
    },
  },
  server: {
    port: Number(process.env.PORT) || 4321,
  },
  integrations: [
    UnoCSS({ injectReset: false }),
    react(),
    obfuscateFirstPartyChunks(),
    sitemap({
      // The sitemap lists the pages meant for readers. `/preview/*` is the
      // editor's own view of unpublished content, reachable only with a token,
      // and listing it pointed every crawler straight at it. Those pages ask
      // crawlers to stay away in their own markup, so leaving them here stated
      // the opposite of what the pages themselves say.
      filter: (page) =>
        !page.includes("/search") && !page.includes("/suggestion") && !page.includes("/preview/"),
    }),
  ],
  vite: {
    plugins: [devProxyPlugin()],
    // Substituted into the footer at build time, so the stylesheet the page
    // carries is the same string the hash above was taken from. A second
    // minification at render time could not guarantee that, and doing it per
    // request would minify the same 3.7 kB on every page view.
    define: {
      __FOOTER_STYLES_CSS__: JSON.stringify(FOOTER_STYLES_MIN_CSS),
    },
    resolve: {
      alias: {
        "@": resolve("./src"),
      },
    },
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/@codemirror/")) {
              return "codemirror";
            }

            if (id.includes("/node_modules/@lezer/")) {
              return "lezer";
            }

            if (
              id.includes("/node_modules/marked") ||
              id.includes("/node_modules/marked-footnote")
            ) {
              return "markdown";
            }

            if (id.includes("/node_modules/react-hook-form/")) {
              return "react-hook-form";
            }
          },
        },
      },
    },
    ssr: {
      noExternal: ["marked"],
    },
    server: {
      allowedHosts: ["lmaa.test"],
    },
  },
});
