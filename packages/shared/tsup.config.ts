import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/utils/api-error.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  noExternal: ["sqids"],
  outDir: "dist",
});
