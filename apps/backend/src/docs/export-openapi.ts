/**
 * Writes the generated OpenAPI document to disk so periwinkle can build the
 * static API reference from it.
 *
 * The document is otherwise only ever produced in memory and served from
 * `/openapi.json`. The docs build is a separate, offline step, so it needs the
 * contract as a file. Run via `npm run docs:build -w @lmaa/backend`.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildOpenApiDocument } from "./openapi-document.js";

/** Output path, relative to the backend workspace root. Gitignored. */
const OUTPUT_FILE = "openapi.generated.json";

const outputPath = resolve(process.cwd(), OUTPUT_FILE);
writeFileSync(outputPath, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);

process.stdout.write(`Wrote OpenAPI document to ${outputPath}\n`);
