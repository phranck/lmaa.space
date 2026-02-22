import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/db/migrate.ts", "src/scripts/seed.ts"],
  format: ["cjs"],
  target: "node22",
  platform: "node",
  bundle: true,
  noExternal: [/^(?!better-sqlite3).+/],
  external: ["better-sqlite3"],
  outDir: "dist",
  clean: true,
});
