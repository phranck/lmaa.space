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
            if (id.includes("/src/lib/buttonIconMap.tsx")) {
              return "button-icons";
            }

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
      proxy: {
        "/api/v1": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  },
});
