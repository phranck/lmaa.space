#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "shopcheck.tsx");

const result = spawnSync(process.execPath, ["--import", "tsx/esm", appPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
   
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);

