import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";
import { resolve } from "node:path";

export default defineConfig({
  site: "https://lmaa.space",
  output: "static",
  integrations: [
    UnoCSS({ injectReset: false }),
    react(),
    sitemap({
      filter: (page) =>
        !page.includes("/suche") && !page.includes("/suggestion"),
    }),
  ],
  redirects: {
    "/kriterien": "/aufnahmekriterien",
  },
  vite: {
    resolve: {
      alias: {
        "@": resolve("./src"),
      },
    },
    build: {
      cssCodeSplit: false,
    },
    server: {
      proxy: {
        "/api": {
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
