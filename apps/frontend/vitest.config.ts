import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // An array rather than a map, because a bare name has to be matched exactly
    // here. Mapping `@lmaa/ui` as a prefix pointed a subpath such as
    // `@lmaa/ui/toggle-switch` at a path inside `index.ts`, and the package's
    // own exports never got asked.
    alias: [
      { find: /^@lmaa\/ui$/, replacement: resolve(__dirname, "../../packages/ui/src/index.ts") },
      {
        find: /^@lmaa\/shared$/,
        replacement: resolve(__dirname, "../../packages/shared/src/index.ts"),
      },
      {
        find: /^@lmaa\/contracts$/,
        replacement: resolve(__dirname, "../../packages/contracts/src/index.ts"),
      },
      { find: /^@\//, replacement: `${resolve(__dirname, "./src")}/` },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
