import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
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
    port: 5174,
    proxy: {
      "/api/v1": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Uploaded category images served by backend
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
