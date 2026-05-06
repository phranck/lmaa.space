import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

function buildDevProxy() {
  const backendUrl = process.env.BACKEND_URL?.trim();
  if (!backendUrl) {
    throw new Error(
      "Missing BACKEND_URL. Define it in .env.local — manually or via pewee.",
    );
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
      "@": resolve(__dirname, "./src"),
      "@lmaa/contracts": resolve(__dirname, "../../packages/contracts/src/index.ts"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@dnd-kit/")) {
            return "dnd-kit";
          }

          if (id.includes("/node_modules/@mdxeditor/")) {
            return "mdxeditor-core";
          }

          if (id.includes("/node_modules/lexical/")) {
            return "lexical";
          }

          if (id.includes("/node_modules/@codemirror/")) {
            return "codemirror";
          }

          if (id.includes("/node_modules/@lezer/")) {
            return "lezer";
          }

          if (id.includes("/node_modules/recharts/")) {
            return "recharts";
          }
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
