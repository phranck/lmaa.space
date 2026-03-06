import path from "node:path";

import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/db/migrate.ts",
    "src/scripts/seed.ts",
    "src/scripts/fetch-og-images.ts",
  ],
  format: ["cjs"],
  target: "node22",
  platform: "node",
  bundle: true,
  noExternal: [/^(?!node:).*/],
  // sharp is a native module — must not be bundled, deploy node_modules/sharp separately
  external: ["sharp"],
  outDir: "dist",
  clean: true,
  esbuildOptions(options) {
    options.nodePaths = [path.resolve(__dirname, "node_modules")];
  },
});
