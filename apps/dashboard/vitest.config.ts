import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      "@lmaa/contracts": resolve(import.meta.dirname, "../../packages/contracts/src/index.ts"),
      "@lmaa/shared": resolve(import.meta.dirname, "../../packages/shared/src/index.ts"),
      "@lmaa/ui/shop-edit-form": resolve(
        import.meta.dirname,
        "../../packages/ui/src/shop-edit-form.ts",
      ),
      "@lmaa/ui": resolve(import.meta.dirname, "../../packages/ui/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    // `tests` holds what needs node rather than a browser, such as reading a
    // source file off disk. The browser project carries no node types, so those
    // cannot live under `src`.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
  },
});
