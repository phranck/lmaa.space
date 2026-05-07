import { resolve } from "node:path";

import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

function devProxyPlugin() {
  return {
    name: "lmaa-dev-proxy",
    apply: "serve",
    config() {
      const backendUrl = process.env.BACKEND_URL?.trim();
      if (!backendUrl) {
        throw new Error(
          "Missing BACKEND_URL. Define it in .env.local — manually or via pewee.",
        );
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
    plugins: [devProxyPlugin()],
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
    },
  },
});
