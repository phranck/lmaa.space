import path from "node:path";

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/db/doctor.ts", "src/db/migrate.ts"],
  format: ["cjs"],
  target: "node22",
  platform: "node",
  bundle: true,
  // Bundle everything except node builtins and sharp. `noExternal` is applied
  // after `external`, so sharp has to be excluded here too: listing it in
  // `external` alone stops working as soon as sharp changes its exports, and
  // the inlined ESM entry then runs `createRequire(import.meta.url)` at module
  // scope, which becomes `createRequire(undefined)` in CommonJS output and
  // kills the process on startup.
  noExternal: [/^(?!node:|sharp(\/|$)).*/],
  // sharp is a native module — must not be bundled, deploy node_modules/sharp separately
  external: ["sharp"],
  outDir: "dist",
  clean: true,
  esbuildOptions(options) {
    options.nodePaths = [path.resolve(__dirname, "node_modules")];
  },
});
