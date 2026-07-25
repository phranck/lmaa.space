import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
}));

vi.mock("../middleware/rate-limit.js", () => ({
  rateLimit: vi.fn(() => (_c: unknown, next: () => Promise<void>) => next()),
  resolveClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("../services/public.js", () => ({
  createManagedDeadLinkReport: vi.fn(),
  createManagedShopConcernReport: vi.fn(),
  getFilteredPublicCategories: vi.fn(),
  getFilteredPublicCategoryBySlug: vi.fn(),
  getFilteredPublicShops: vi.fn(),
  getManagedPublicCacheStats: vi.fn(),
  getManagedPublicCategories: vi.fn(),
  getManagedPublicCategoryBySlug: vi.fn(),
  getManagedPublicContentPageBySlug: vi.fn(),
  getManagedPublicContentPages: vi.fn(),
  getManagedPublicNavItems: vi.fn(),
  getManagedPublicRejectionPageByToken: vi.fn(),
  getManagedPublicShopById: vi.fn(),
  getManagedPublicShops: vi.fn(),
  getManagedPublicStats: vi.fn(),
  getPublicFilterOptions: vi.fn(),
  searchFilteredPublicCatalog: vi.fn(),
  searchManagedPublicCatalog: vi.fn(),
  toggleShopLike: vi.fn(),
  validateShopUrl: vi.fn(),
}));

vi.mock("../services/admin-form-config.js", () => ({
  getManagedPublicFormConfig: vi.fn(),
  getManagedPublicFormConfigBySlug: vi.fn(),
}));

vi.mock("../services/admin-media.js", () => ({
  getMediaAliasMap: vi.fn(),
  getMediaShortcodeAssetMap: vi.fn(),
}));

vi.mock("../repositories/footer-config.js", () => ({
  getFooterConfig: vi.fn(),
}));

vi.mock("../repositories/markdown-widgets.js", () => ({
  getEnabledMarkdownWidgetByKey: vi.fn(),
}));

vi.mock("../services/footer-preview-store.js", () => ({
  getFooterPreviewSession: vi.fn(),
}));

vi.mock("../services/content-preview-store.js", () => ({
  getContentPreviewSession: vi.fn(),
}));

vi.mock("../services/form-submission.js", () => ({
  executeSubmissionChain: vi.fn(),
}));

vi.mock("../services/form-validation.js", () => ({
  buildFormValidationSchema: vi.fn(),
}));

vi.mock("../services/social-media-accounts.js", () => ({
  listFooterSocialMediaAccounts: vi.fn(),
}));

import {
  buildOpenApiDocument,
  documentedRouteKeys,
  excludedPublicRouteKeys,
} from "../docs/openapi-document.js";
import { hasBuiltApiReference, serveApiReference, serveOpenApiJson } from "../docs/openapi.js";
import { publicRoutes } from "../routes/public.js";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const APPROVED_DOCUMENTED_ROUTE_KEYS = [
  "GET /api/v1/shops",
  "GET /api/v1/shops/{token}",
  "GET /api/v1/categories",
  "GET /api/v1/categories/{slug}",
  "GET /api/v1/search",
  "GET /api/v1/check-url",
  "GET /api/v1/rejected/{token}",
  "GET /api/v1/filtered/shops",
  "GET /api/v1/filtered/categories",
  "GET /api/v1/filtered/categories/{slug}",
  "GET /api/v1/filtered/search",
  "GET /api/v1/filter-options",
  "GET /health",
].sort();

function normalizeHonoRoutePath(path: string): string {
  return `/api/v1${path}`.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function getRegisteredPublicRouteKeys(): string[] {
  const keys = new Set<string>();
  for (const route of publicRoutes.routes as { method: string; path: string }[]) {
    if (route.method === "ALL") continue;
    keys.add(`${route.method} ${normalizeHonoRoutePath(route.path)}`);
  }
  return Array.from(keys).sort();
}

function collectDocumentRouteKeys(): string[] {
  const doc = buildOpenApiDocument();
  const keys: string[] = [];
  const paths = doc.paths as Record<string, Record<string, unknown>>;
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of Object.keys(pathItem)) {
      keys.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return keys.sort();
}

function collectRefs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectRefs);

  const record = value as Record<string, unknown>;
  const ownRef = typeof record.$ref === "string" ? [record.$ref] : [];
  return ownRef.concat(Object.values(record).flatMap(collectRefs));
}

function componentNameFromRef(schemaRef: string): string | null {
  return schemaRef.match(/^#\/components\/schemas\/(.+)$/)?.[1] ?? null;
}

function collectTransitiveSchemaNames(doc: ReturnType<typeof buildOpenApiDocument>): string[] {
  const schemas = doc.components.schemas as Record<string, unknown>;
  const schemaNames = new Set<string>();
  for (const ref of collectRefs({ paths: doc.paths })) {
    const name = componentNameFromRef(ref);
    if (name) schemaNames.add(name);
  }

  let hasNewRefs = true;
  while (hasNewRefs) {
    hasNewRefs = false;
    for (const schemaName of [...schemaNames]) {
      const previousSize = schemaNames.size;
      for (const nestedRef of collectRefs(schemas[schemaName])) {
        const nestedSchemaName = componentNameFromRef(nestedRef);
        if (nestedSchemaName) schemaNames.add(nestedSchemaName);
      }
      hasNewRefs = hasNewRefs || schemaNames.size > previousSize;
    }
  }

  return Array.from(schemaNames).sort();
}

describe("OpenAPI document", () => {
  it("documents only the approved external public endpoints", () => {
    expect(documentedRouteKeys().sort()).toEqual(APPROVED_DOCUMENTED_ROUTE_KEYS);
    expect(documentedRouteKeys()).not.toContain("GET /api/v1/stats");
    expect(documentedRouteKeys().some((key) => key.includes("/admin/"))).toBe(false);
  });

  it("keeps every registered public route explicitly documented or excluded", () => {
    const documentedPublicKeys = documentedRouteKeys().filter((key) => key.includes(" /api/v1/"));
    const accountedForKeys = [...documentedPublicKeys, ...excludedPublicRouteKeys].sort();

    expect(getRegisteredPublicRouteKeys()).toEqual(accountedForKeys);
  });

  it("builds paths from the documented operation registry", () => {
    expect(collectDocumentRouteKeys()).toEqual(APPROVED_DOCUMENTED_ROUTE_KEYS);
  });

  it("does not contain unresolved component schema references", () => {
    const doc = buildOpenApiDocument();
    const schemaNames = new Set(Object.keys(doc.components.schemas));
    const refs = collectRefs(doc);

    for (const schemaRef of refs) {
      const schemaName = componentNameFromRef(schemaRef);
      expect(schemaName, `Unsupported $ref format: ${schemaRef}`).not.toBeNull();
      expect(schemaNames.has(schemaName ?? ""), `Missing schema for ${schemaRef}`).toBe(true);
    }
  });

  it("exposes only component schemas reachable from public operations", () => {
    const doc = buildOpenApiDocument();

    expect(Object.keys(doc.components.schemas).sort()).toEqual(collectTransitiveSchemaNames(doc));
    expect(doc.components.schemas).not.toHaveProperty("ShopVisibility");
  });

  it("adds curated SDK examples to each public operation", () => {
    const doc = buildOpenApiDocument();
    const listShopsOperation = doc.paths["/api/v1/shops"].get as Record<string, unknown>;
    const healthOperation = doc.paths["/health"].get as Record<string, unknown>;
    const samples = listShopsOperation["x-codeSamples"] as {
      lang: string;
      label: string;
      source: string;
    }[];

    expect(samples.map(({ lang, label }) => `${lang}:${label}`)).toEqual([
      "Curl:cURL",
      "Shell:POSIX",
      "Node.js:Fetch",
      "PHP:Guzzle",
      "Python:Requests",
      "Ruby:Net::HTTP",
      "Rust:Reqwest",
      "Swift:URLSession",
      "ObjC:NSURLSession",
      "C:libcurl",
    ]);
    expect(listShopsOperation["x-code-samples"]).toEqual(samples);
    expect(samples[0].source).toContain("curl --request GET");
    expect(samples[2].source).toContain('fetch("https://api.lmaa.space/api/v1/shops"');
    expect(samples[3].source).toContain("GuzzleHttp");
    expect(samples[9].source).toContain("curl_easy_setopt");
    expect((healthOperation["x-codeSamples"] as typeof samples)[2].source).toContain(
      "console.log(payload);",
    );
  });

  it("serves the generated OpenAPI JSON document without caching", async () => {
    const app = new Hono();
    app.get("/openapi.json", serveOpenApiJson);

    const response = await app.request("/openapi.json");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.info.title).toBe("LMAA Public API");
    expect(body.openapi).toBe("3.1.0");
    expect(body.servers).toEqual([{ url: "https://api.lmaa.space", description: "Production" }]);
  });

  it("serves the static periwinkle reference, or names the missing docs build", async () => {
    // `docs-dist/` is gitignored and only exists after `npm run docs:build`,
    // so both states are legitimate; each has its own contract.
    const app = new Hono();
    app.get("/docs/*", serveApiReference);

    const response = await app.request("/docs/");

    expect(response.headers.get("cache-control")).toBe("no-store");
    if (hasBuiltApiReference()) {
      expect(response.status).toBe(200);
      const csp = response.headers.get("content-security-policy") ?? "";
      expect(csp).toContain("https://api.lmaa.space");
      // The generated site is self-contained: no CDN origin is allowed.
      expect(csp).not.toContain("cdn.jsdelivr.net");
      const html = await response.text();
      expect(html).toContain("LMAA Public API");
      expect(html).not.toContain("Scalar.createApiReference");
    } else {
      expect(response.status).toBe(503);
      expect(await response.text()).toContain("npm run docs:build");
    }
  });

  it("builds and deploys the docs alongside the backend", () => {
    const zeropsConfig = readFileSync(resolve(repositoryRoot, "zerops.yml"), "utf8");
    const backendPackageJson = readFileSync(
      resolve(repositoryRoot, "apps/backend/package.json"),
      "utf8",
    );

    expect(zeropsConfig).toContain("npm run docs:build -w @lmaa/backend");
    expect(zeropsConfig).toContain("- apps/backend/docs-dist");
    // Scalar is gone for good; the reference is generated by periwinkle.
    expect(backendPackageJson).not.toContain("@scalar/");
    expect(backendPackageJson).toContain("periwinkle");
  });

  it("keeps API documentation fonts in deployable shared source assets", () => {
    const zeropsConfig = readFileSync(resolve(repositoryRoot, "zerops.yml"), "utf8");
    const backendEntry = readFileSync(
      resolve(repositoryRoot, "apps/backend/src/index.ts"),
      "utf8",
    );

    expect(zeropsConfig).not.toContain("apps/frontend/public/fonts");
    expect(zeropsConfig).toContain("- apps/frontend/src/assets/fonts");
    expect(existsSync(resolve(repositoryRoot, "apps/frontend/src/assets/fonts/fonts.css"))).toBe(
      true,
    );
    expect(backendEntry).not.toContain("apps/frontend/public");
    expect(backendEntry).toContain('"apps/frontend/src/assets"');
  });
});
