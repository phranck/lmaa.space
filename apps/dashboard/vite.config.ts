import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

function buildDevProxy() {
  const backendUrl = process.env.BACKEND_URL?.trim();
  if (!backendUrl) {
    throw new Error("Missing BACKEND_URL. Define it in .env.local — manually or via pewee.");
  }
  return {
    "/api/v1": { target: backendUrl, changeOrigin: true },
    // Uploaded category images served by backend
    "/uploads": { target: backendUrl, changeOrigin: true },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), UnoCSS()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      "@lmaa/contracts": resolve(import.meta.dirname, "../../packages/contracts/src/index.ts"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "dnd-kit", test: /node_modules[\\/]@dnd-kit[\\/]/ },
            // The Lezer parsers ride along: Rolldown puts the dependencies of a
            // captured module into the same chunk, so a group of their own
            // would stay empty.
            { name: "codemirror", test: /node_modules[\\/]@(codemirror|lezer)[\\/]/ },
            { name: "recharts", test: /node_modules[\\/]recharts[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5174,
    allowedHosts: ["dashboard.lmaa.test"],
    ...(command === "serve" ? { proxy: buildDevProxy() } : {}),
  },
}));
