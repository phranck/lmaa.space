import type { Context } from "hono";

import { env } from "../config/env.js";

/**
 * Builds the OpenAPI server list based on runtime environment.
 *
 * @returns Preferred public server URL plus localhost fallback for local testing.
 */
function getOpenApiServers() {
  const localServer = { url: "http://localhost:3000", description: "Local development" };

  if (env.NODE_ENV === "production") {
    return [
      { url: "https://lmaa.space", description: "Production (same-origin proxy)" },
      localServer,
    ];
  }

  return [localServer];
}

/**
 * OpenAPI 3.1 document for public API consumers.
 */
const OPEN_API_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "LMAA API",
    version: "1.0.0",
    description: "Official API for lmaa.space. Public endpoints are stable for integrations.",
    contact: {
      name: "LMAA",
      url: "https://lmaa.space",
      email: "hallo@lmaa.space",
    },
  },
  servers: getOpenApiServers(),
  tags: [
    {
      name: "Public",
      description: "Public endpoints intended for website and external consumers.",
    },
    { name: "System", description: "Operational endpoints for health and diagnostics." },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Backend is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", const: "ok" } },
                  required: ["status"],
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/categories": {
      get: {
        tags: ["Public"],
        summary: "List categories",
        operationId: "getPublicCategories",
        responses: {
          "200": {
            description: "Category list with public shop counters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PublicCategoryListEnvelope",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/categories/{slug}": {
      get: {
        tags: ["Public"],
        summary: "Get category details",
        operationId: "getPublicCategoryBySlug",
        parameters: [
          {
            in: "path",
            name: "slug",
            required: true,
            schema: { type: "string" },
            description: "Category slug",
          },
        ],
        responses: {
          "200": {
            description: "Category details including shops",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PublicCategoryDetailEnvelope",
                },
              },
            },
          },
          "404": {
            description: "Category not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
        },
      },
    },
    "/api/v1/stats": {
      get: {
        tags: ["Public"],
        summary: "Get public counters",
        operationId: "getPublicStats",
        responses: {
          "200": {
            description: "Public top-level counters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublicStatsEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/shops": {
      get: {
        tags: ["Public"],
        summary: "List all public shops",
        operationId: "getPublicShops",
        responses: {
          "200": {
            description: "All public/active shops",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublicShopListEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/search": {
      get: {
        tags: ["Public"],
        summary: "Search shops and categories",
        operationId: "searchPublicCatalog",
        parameters: [
          {
            in: "query",
            name: "q",
            required: false,
            schema: { type: "string", minLength: 2 },
            description: "Search query string",
          },
        ],
        responses: {
          "200": {
            description: "Search result set",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SearchResultEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/check-url": {
      get: {
        tags: ["Public"],
        summary: "Check if a shop URL already exists",
        operationId: "checkPublicShopUrl",
        parameters: [
          {
            in: "query",
            name: "url",
            required: true,
            schema: { type: "string", format: "uri" },
            description: "Candidate shop URL",
          },
        ],
        responses: {
          "200": {
            description: "Duplicate URL check result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckUrlEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/submissions": {
      post: {
        tags: ["Public"],
        summary: "Create a new shop submission",
        operationId: "createSubmission",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubmissionCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Submission created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation failed",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
        },
      },
    },
    "/api/v1/nav/{navId}": {
      get: {
        tags: ["Public"],
        summary: "List public navigation items",
        operationId: "getPublicNav",
        parameters: [
          {
            in: "path",
            name: "navId",
            required: true,
            schema: { type: "string", enum: ["header", "footer"] },
          },
        ],
        responses: {
          "200": {
            description: "Navigation item list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PublicNavListEnvelope" },
              },
            },
          },
          "400": {
            description: "Invalid nav id",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
        },
      },
    },
    "/api/v1/content": {
      get: {
        tags: ["Public"],
        summary: "List published content pages",
        operationId: "listPublishedContentPages",
        responses: {
          "200": {
            description: "Published pages (slug/title)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContentListEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/content/{slug}": {
      get: {
        tags: ["Public"],
        summary: "Get one published content page",
        operationId: "getPublishedContentPage",
        parameters: [
          {
            in: "path",
            name: "slug",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Published content page",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContentPageEnvelope" },
              },
            },
          },
          "404": {
            description: "Page not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
        },
      },
    },
    "/api/v1/shops/{id}/report": {
      post: {
        tags: ["Public"],
        summary: "Report a dead shop link",
        operationId: "reportDeadLink",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } },
        ],
        responses: {
          "200": {
            description: "Report accepted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/MessageEnvelope" } },
            },
          },
          "400": {
            description: "Invalid shop id",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
          "404": {
            description: "Shop not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
        },
      },
    },
    "/api/v1/shops/{id}/concern": {
      post: {
        tags: ["Public"],
        summary: "Submit a moderation concern for a shop",
        operationId: "reportShopConcern",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", minLength: 10 },
                },
                required: ["reason"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Concern accepted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/MessageEnvelope" } },
            },
          },
          "400": {
            description: "Invalid reason or id",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
          "404": {
            description: "Shop not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ErrorEnvelope: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              code: { type: "string" },
            },
            required: ["message"],
          },
        },
        required: ["error"],
      },
      MessageEnvelope: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: { message: { type: "string" } },
            required: ["message"],
          },
        },
        required: ["data"],
      },
      RegionCode: {
        type: "string",
        enum: ["DE", "AT", "CH", "EU", "WORLD"],
      },
      ShopCategory: {
        type: "object",
        properties: {
          id: { type: "integer" },
          slug: { type: "string" },
          name: { type: "string" },
        },
        required: ["id", "slug", "name"],
      },
      PublicCategorySummary: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          slug: { type: "string" },
          imageUrl: { type: ["string", "null"], format: "uri" },
          shopCount: { type: "integer", minimum: 0 },
        },
        required: ["id", "name", "slug", "shopCount"],
      },
      PublicShop: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          url: { type: "string", format: "uri" },
          categories: { type: "array", items: { $ref: "#/components/schemas/ShopCategory" } },
          region: { type: "array", items: { $ref: "#/components/schemas/RegionCode" } },
          pickup: { type: "string" },
          shipping: { type: "string" },
          description: { type: "string" },
          ogImage: { type: ["string", "null"], format: "uri" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "name",
          "url",
          "categories",
          "region",
          "pickup",
          "shipping",
          "description",
          "isActive",
          "createdAt",
          "updatedAt",
        ],
      },
      PublicCategoryDetail: {
        allOf: [
          { $ref: "#/components/schemas/PublicCategorySummary" },
          {
            type: "object",
            properties: {
              shops: { type: "array", items: { $ref: "#/components/schemas/PublicShop" } },
            },
            required: ["shops"],
          },
        ],
      },
      PublicCategoryListEnvelope: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/PublicCategorySummary" } },
        },
        required: ["data"],
      },
      PublicCategoryDetailEnvelope: {
        type: "object",
        properties: {
          data: { $ref: "#/components/schemas/PublicCategoryDetail" },
        },
        required: ["data"],
      },
      PublicShopListEnvelope: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/PublicShop" } },
        },
        required: ["data"],
      },
      PublicStatsEnvelope: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              shopCount: { type: "integer", minimum: 0 },
            },
            required: ["shopCount"],
          },
        },
        required: ["data"],
      },
      SearchResultEnvelope: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              query: { type: "string" },
              total: { type: "integer", minimum: 0 },
              shops: { type: "array", items: { $ref: "#/components/schemas/PublicShop" } },
              categories: {
                type: "array",
                items: { $ref: "#/components/schemas/PublicCategorySummary" },
              },
            },
            required: ["query", "total", "shops", "categories"],
          },
        },
        required: ["data"],
      },
      CheckUrlEnvelope: {
        type: "object",
        properties: {
          data: {
            oneOf: [
              {
                type: "object",
                properties: { exists: { type: "boolean", const: false } },
                required: ["exists"],
              },
              {
                type: "object",
                properties: {
                  exists: { type: "boolean", const: true },
                  shop: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                      categories: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ShopCategory" },
                      },
                    },
                    required: ["id", "name", "categories"],
                  },
                },
                required: ["exists", "shop"],
              },
            ],
          },
        },
        required: ["data"],
      },
      SubmissionCreate: {
        type: "object",
        properties: {
          shopName: { type: "string", minLength: 2, maxLength: 100 },
          shopUrl: { type: "string", format: "uri" },
          categoryIds: { type: "array", items: { type: "integer", minimum: 1 } },
          categorySuggestion: { type: "string", maxLength: 100 },
          region: { type: "array", items: { $ref: "#/components/schemas/RegionCode" } },
          shipping: { type: "string", maxLength: 200 },
          description: { type: "string", maxLength: 2000 },
          submitterEmail: { type: "string", format: "email" },
          submitterNote: { type: "string", maxLength: 500 },
        },
        required: ["shopName", "shopUrl", "region"],
      },
      PublicNavItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          navId: { type: "string", enum: ["header", "footer"] },
          pageSlug: { type: ["string", "null"] },
          pageTitle: { type: ["string", "null"] },
          url: { type: ["string", "null"], format: "uri" },
          target: { type: "string", enum: ["_self", "_blank"] },
          label: { type: ["string", "null"] },
          position: { type: "integer" },
        },
        required: ["id", "navId", "target", "position"],
      },
      PublicNavListEnvelope: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/PublicNavItem" } },
        },
        required: ["data"],
      },
      ContentSummary: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
        },
        required: ["slug", "title"],
      },
      ContentListEnvelope: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/ContentSummary" } },
        },
        required: ["data"],
      },
      ContentPage: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          status: { type: "string", enum: ["draft", "published", "hidden"] },
          createdAt: { type: "string", format: "date-time" },
          createdBy: { type: ["integer", "null"] },
          updatedAt: { type: ["string", "null"], format: "date-time" },
          updatedBy: { type: ["integer", "null"] },
        },
        required: ["slug", "title", "content", "status", "createdAt"],
      },
      ContentPageEnvelope: {
        type: "object",
        properties: {
          data: { $ref: "#/components/schemas/ContentPage" },
        },
        required: ["data"],
      },
    },
  },
} as const;

/**
 * Serves `openapi.json` with no-cache headers.
 *
 * @param c - Hono context.
 * @returns OpenAPI JSON response.
 */
export function serveOpenApiJson(c: Context) {
  c.header("Cache-Control", "no-store");
  return c.json(OPEN_API_DOCUMENT);
}

/**
 * Renders the Scalar API Reference shell.
 *
 * @returns HTML document string.
 */
function renderApiReferenceHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LMAA API Reference</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; background: #0b0f14; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/openapi.json"
      data-configuration='{"theme":"purple","layout":"modern","showSidebar":true,"hideModels":true}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
}

/**
 * Serves interactive API docs UI at `/` and `/docs`.
 *
 * @param c - Hono context.
 * @returns HTML response rendering Scalar API reference.
 */
export function serveApiDocsUi(c: Context) {
  c.header("Cache-Control", "no-store");
  return c.html(renderApiReferenceHtml());
}
