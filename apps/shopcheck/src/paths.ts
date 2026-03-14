import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SHOPCHECK_DIR = path.resolve(__dirname, "..");

export const PATHS = {
  state: path.join(SHOPCHECK_DIR, "state.json"),
  results: path.join(SHOPCHECK_DIR, "results.json"),
  resultsState: path.join(SHOPCHECK_DIR, "results-state.json"),
  log: path.join(SHOPCHECK_DIR, "log.ndjson"),
  metricsHistory: path.join(SHOPCHECK_DIR, "metrics-history.ndjson"),
  inputFallback: path.join(SHOPCHECK_DIR, "input-shops.json"),
  categoriesCache: path.join(SHOPCHECK_DIR, "categories-cache.json"),
  reports: path.join(SHOPCHECK_DIR, "reports"),
  rejections: path.join(SHOPCHECK_DIR, "rejection.txt"),
} as const;
