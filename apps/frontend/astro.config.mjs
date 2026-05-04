import { resolve } from "node:path";

import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

export default defineConfig({
  site: "https://lmaa.space",
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: {
    port: Number(process.env.PORT) || 4321,
  },
  integrations: [
    UnoCSS({ injectReset: false }),
    react(),
    sitemap({
      filter: (page) => !page.includes("/search") && !page.includes("/suggestion"),
    }),
  ],
  vite: {
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

            if (id.includes("/node_modules/marked") || id.includes("/node_modules/marked-footnote")) {
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
      proxy: {
        // pewee writes BACKEND_URL into .pewee.env at startup; same-origin
        // /api/v1 calls from the frontend still need to be forwarded to the
        // backend at the Vite layer because pewee's Caddy routing is
        // host-based only. The 127.0.0.1 fallback is for non-pewee runs.
        "/api/v1": {
          target: process.env.BACKEND_URL ?? "http://127.0.0.1:3000",
          changeOrigin: true,
        },
        "/uploads": {
          target: process.env.BACKEND_URL ?? "http://127.0.0.1:3000",
          changeOrigin: true,
        },
      },
    },
  },
});
