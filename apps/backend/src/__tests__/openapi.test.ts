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
import { publicRoutes } from "../routes/public.js";

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
  return [...keys].sort();
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
      const match = schemaRef.match(/^#\/components\/schemas\/(.+)$/);
      expect(match, `Unsupported $ref format: ${schemaRef}`).not.toBeNull();
      expect(schemaNames.has(match?.[1] ?? ""), `Missing schema for ${schemaRef}`).toBe(true);
    }
  });
});
