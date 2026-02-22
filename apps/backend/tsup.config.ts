import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/db/migrate.ts", "src/scripts/seed.ts", "src/scripts/fetch-og-images.ts"],
  format: ["cjs"],
  target: "node22",
  platform: "node",
  bundle: true,
  noExternal: [/^(?!node:).*/],
  outDir: "dist",
  clean: true,
});
