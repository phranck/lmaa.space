import type { Context } from "hono";

import { env } from "../config/env.js";

function getOpenApiServers() {
  const localServer = { url: "http://localhost:3000", description: "Local development" };

  if (env.NODE_ENV === "production") {
    return [
      { url: "https://lmaa.space", description: "Production" },
      localServer,
    ];
  }

  return [localServer];
}

const OPEN_API_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "LMAA API",
    version: "1.0.0",
    description:
      "Public REST API for lmaa.space -- a community-curated directory of independent online shops as alternatives to Amazon in the DACH region.",
    contact: {
      name: "LMAA",
      url: "https://lmaa.space",
      email: "hallo@lmaa.space",
    },
  },
  servers: getOpenApiServers(),
  tags: [
    { name: "Shops", description: "Browse and search the shop catalog." },
    { name: "Categories", description: "Browse shop categories." },
    { name: "Content", description: "Public content pages." },
    { name: "System", description: "Operational endpoints." },
  ],
  paths: {
    "/api/v1/shops": {
      get: {
        tags: ["Shops"],
        summary: "List all shops",
        description: "Returns every public/active shop with description, categories, shipping regions and social media links.",
        operationId: "listShops",
        responses: {
          "200": {
            description: "Shop list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShopListEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/search": {
      get: {
        tags: ["Shops"],
        summary: "Search shops and categories",
        description: "Full-text search across shop names, descriptions and category names.",
        operationId: "search",
        parameters: [
          {
            in: "query",
            name: "q",
            required: false,
            schema: { type: "string", minLength: 2 },
            description: "Search query (minimum 2 characters)",
          },
        ],
        responses: {
          "200": {
            description: "Search results",
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
        tags: ["Shops"],
        summary: "Check if a shop URL already exists",
        description: "Checks whether a given URL is already listed. Useful before submitting a new shop.",
        operationId: "checkUrl",
        parameters: [
          {
            in: "query",
            name: "url",
            required: true,
            schema: { type: "string", format: "uri" },
            description: "Shop URL to check",
          },
        ],
        responses: {
          "200": {
            description: "Check result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckUrlEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/categories": {
      get: {
        tags: ["Categories"],
        summary: "List all categories",
        description: "Returns all categories with slug, image URL and number of listed shops.",
        operationId: "listCategories",
        responses: {
          "200": {
            description: "Category list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CategoryListEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/categories/{slug}": {
      get: {
        tags: ["Categories"],
        summary: "Get category with shops",
        description: "Returns a single category including all shops assigned to it.",
        operationId: "getCategoryBySlug",
        parameters: [
          {
            in: "path",
            name: "slug",
            required: true,
            schema: { type: "string" },
            description: "Category slug (e.g. `bekleidung-textilien`)",
          },
        ],
        responses: {
          "200": {
            description: "Category with shops",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CategoryDetailEnvelope" },
              },
            },
          },
          "404": {
            description: "Category not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/stats": {
      get: {
        tags: ["System"],
        summary: "Public counters",
        description: "Returns aggregate counters (e.g. total number of listed shops).",
        operationId: "getStats",
        responses: {
          "200": {
            description: "Counters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StatsEnvelope" },
              },
            },
          },
        },
      },
    },
    "/api/v1/rejected/{token}": {
      get: {
        tags: ["Content"],
        summary: "View rejection reason",
        description: "Returns the public rejection page for a shop submission identified by its token.",
        operationId: "getRejectionPage",
        parameters: [
          {
            in: "path",
            name: "token",
            required: true,
            schema: { type: "string", pattern: "^[0-9a-f]{32}$" },
            description: "32-character hex token",
          },
        ],
        responses: {
          "200": {
            description: "Rejection page content",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RejectionPageEnvelope" },
              },
            },
          },
          "400": {
            description: "Invalid token format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
          "404": {
            description: "Token not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description: "Returns `ok` when the backend and database are reachable.",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "Healthy",
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
          "503": {
            description: "Degraded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", const: "degraded" },
                    reason: { type: "string" },
                  },
                  required: ["status", "reason"],
                },
              },
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
      SocialMedia: {
        type: "object",
        properties: {
          facebook: { type: ["string", "null"] },
          instagram: { type: ["string", "null"] },
          twitter: { type: ["string", "null"] },
          youtube: { type: ["string", "null"] },
          tiktok: { type: ["string", "null"] },
          linkedin: { type: ["string", "null"] },
          pinterest: { type: ["string", "null"] },
          mastodon: { type: ["string", "null"] },
        },
      },
      Shop: {
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
          contactEmail: { type: ["string", "null"] },
          socialMedia: { $ref: "#/components/schemas/SocialMedia" },
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
      CategorySummary: {
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
      CategoryDetail: {
        allOf: [
          { $ref: "#/components/schemas/CategorySummary" },
          {
            type: "object",
            properties: {
              shops: { type: "array", items: { $ref: "#/components/schemas/Shop" } },
            },
            required: ["shops"],
          },
        ],
      },
      ShopListEnvelope: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Shop" } },
        },
        required: ["data"],
      },
      CategoryListEnvelope: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/CategorySummary" } },
        },
        required: ["data"],
      },
      CategoryDetailEnvelope: {
        type: "object",
        properties: {
          data: { $ref: "#/components/schemas/CategoryDetail" },
        },
        required: ["data"],
      },
      StatsEnvelope: {
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
              shops: { type: "array", items: { $ref: "#/components/schemas/Shop" } },
              categories: { type: "array", items: { $ref: "#/components/schemas/CategorySummary" } },
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
      RejectionPageEnvelope: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              shopName: { type: "string" },
              reason: { type: "string" },
            },
            required: ["shopName", "reason"],
          },
        },
        required: ["data"],
      },
    },
  },
} as const;

export function serveOpenApiJson(c: Context) {
  c.header("Cache-Control", "no-store");
  return c.json(OPEN_API_DOCUMENT);
}

export function serveSwaggerUi(c: Context) {
  c.header("Cache-Control", "no-store");
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LMAA API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
      });
    </script>
  </body>
</html>`);
}
