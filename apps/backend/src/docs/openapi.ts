import type { Context } from "hono";

function getOpenApiServers() {
  return [{ url: "https://lmaa.space", description: "Production" }];
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
    {
      name: "Shops",
      description:
        "Endpoints for browsing and searching the shop catalog. All shops are manually curated and verified against the lmaa.space admission criteria.",
    },
    {
      name: "Categories",
      description:
        "Endpoints for browsing shop categories. Each category groups related shops and includes a shop count and optional cover image.",
    },
    { name: "Content", description: "Public content pages and rejection notices." },
    { name: "System", description: "Operational endpoints for monitoring and statistics." },
  ],
  paths: {
    "/api/v1/shops": {
      get: {
        tags: ["Shops"],
        summary: "List all shops",
        description:
          "Returns every active, publicly listed shop. Each shop object includes its name, URL, description, assigned categories, shipping regions (DE/AT/CH/EU/WORLD), pickup information, Open Graph image, contact email, social media links, and timestamps. The response is cached for 60 seconds.",
        operationId: "listShops",
        responses: {
          "200": {
            description: "Array of all active shops wrapped in a `data` envelope.",
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
        description:
          "Performs a case-insensitive substring search across the catalog. **Searched fields (shops):** shop name, URL, description, and names of assigned categories. **Searched fields (categories):** category name. Shop results are ranked by relevance: name matches first, then URL, then description. Category results are limited to 5 matches. Returns empty arrays when the query is missing or shorter than 2 characters.",
        operationId: "search",
        parameters: [
          {
            in: "query",
            name: "q",
            required: false,
            schema: { type: "string", minLength: 2 },
            description:
              "Search term (minimum 2 characters). Shorter or empty values return an empty result set without error.",
          },
        ],
        responses: {
          "200": {
            description:
              "Object containing the echoed query string, matching shops (sorted by relevance), matching categories (max 5), and a total count.",
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
        description:
          "Checks whether a shop with the same hostname is already listed in the catalog. The comparison is performed on the normalized hostname (scheme and path are stripped, `www.` is removed). Returns `exists: false` for unknown URLs, or `exists: true` together with the matching shop's id, name, and categories.",
        operationId: "checkUrl",
        parameters: [
          {
            in: "query",
            name: "url",
            required: true,
            schema: { type: "string", format: "uri" },
            description: "Full shop URL to check (e.g. `https://www.example.com/shop`). Only the hostname is compared.",
          },
        ],
        responses: {
          "200": {
            description:
              "Either `{ exists: false }` when no match is found, or `{ exists: true, shop: { id, name, categories } }` when a shop with the same hostname exists.",
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
        description:
          "Returns all categories. Each category includes its id, name, URL-safe slug, an optional cover image URL (from Unsplash), and the number of publicly listed shops in that category.",
        operationId: "listCategories",
        responses: {
          "200": {
            description: "Array of all categories with shop counts, wrapped in a `data` envelope.",
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
        summary: "Get category with its shops",
        description:
          "Returns a single category by its slug, including the full list of shops assigned to it. Each shop in the response contains the same fields as in the `/shops` endpoint. Use the slug values from the category list endpoint.",
        operationId: "getCategoryBySlug",
        parameters: [
          {
            in: "path",
            name: "slug",
            required: true,
            schema: { type: "string" },
            description: "URL-safe category slug as returned by the category list endpoint (e.g. `bekleidung-textilien`, `ernaehrung`).",
          },
        ],
        responses: {
          "200": {
            description: "Category object with a nested `shops` array, wrapped in a `data` envelope.",
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
        description:
          "Returns aggregate statistics about the catalog. Currently provides the total number of active, publicly listed shops (`shopCount`). Cached for 60 seconds.",
        operationId: "getStats",
        responses: {
          "200": {
            description: "Object with `shopCount`, wrapped in a `data` envelope.",
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
        description:
          "Returns the public rejection notice for a shop submission that was not accepted. Each rejected submission receives a unique 32-character hex token. The response contains the shop name and a detailed, factual explanation of the rejection reasons. Cached for 1 hour.",
        operationId: "getRejectionPage",
        parameters: [
          {
            in: "path",
            name: "token",
            required: true,
            schema: { type: "string", pattern: "^[0-9a-f]{32}$" },
            description: "32-character lowercase hex token that uniquely identifies the rejection notice.",
          },
        ],
        responses: {
          "200": {
            description: "Object with `shopName` and `reason` (Markdown-formatted rejection text), wrapped in a `data` envelope.",
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
        description:
          "Returns `ok` when the backend is running and the database connection is healthy. Returns `degraded` with a reason when the database is unreachable. Useful for uptime monitoring.",
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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --lmaa-gold: #d4a843;
        --lmaa-dark: #0b0f14;
        --lmaa-gray: #1a1f28;
        --lmaa-text: #e0e0e0;
        --lmaa-text-muted: #9ca3af;
      }
      body {
        margin: 0;
        background: var(--lmaa-dark);
        color: var(--lmaa-text);
      }
      .swagger-ui {
        font-family: "Barlow", system-ui, sans-serif;
      }
      .swagger-ui .info .title,
      .swagger-ui .opblock-tag,
      .swagger-ui section.models h4,
      .swagger-ui .responses-inner h4,
      .swagger-ui .responses-inner h5,
      .swagger-ui .opblock .opblock-summary-method {
        font-family: "Barlow Condensed", "Barlow", system-ui, sans-serif;
      }
      /* Hide topbar and server selector (single server) */
      .topbar,
      .swagger-ui .scheme-container { display: none; }
      /* Info header */
      .swagger-ui .info .title { color: var(--lmaa-gold); }
      .swagger-ui .info .description,
      .swagger-ui .info .description p { color: var(--lmaa-text); }
      .swagger-ui .info a { color: var(--lmaa-gold); }
      /* Dark background for main area */
      .swagger-ui .wrapper { background: var(--lmaa-dark); }
      .swagger-ui { background: var(--lmaa-dark); }
      /* Tag headers */
      .swagger-ui .opblock-tag { color: var(--lmaa-text); border-bottom-color: var(--lmaa-gray); }
      .swagger-ui .opblock-tag small { color: var(--lmaa-text-muted); }
      /* Operation blocks */
      .swagger-ui .opblock .opblock-summary-description { color: var(--lmaa-text-muted); }
      .swagger-ui .opblock .opblock-summary-operation-id { color: var(--lmaa-text-muted); }
      /* Description text */
      .swagger-ui .opblock-description-wrapper p,
      .swagger-ui .opblock-external-docs-wrapper p,
      .swagger-ui table thead tr td,
      .swagger-ui table thead tr th,
      .swagger-ui .response-col_description__inner p,
      .swagger-ui .parameter__name,
      .swagger-ui .parameter__type,
      .swagger-ui .parameter__in { color: var(--lmaa-text); }
      /* Models / Schemas */
      .swagger-ui section.models { border-color: var(--lmaa-gray); }
      .swagger-ui section.models h4 { color: var(--lmaa-text); }
      .swagger-ui .model-title { color: var(--lmaa-text); }
      .swagger-ui .model { color: var(--lmaa-text-muted); }
      .swagger-ui .prop-type { color: var(--lmaa-gold); }
      /* Response section */
      .swagger-ui .responses-inner h4,
      .swagger-ui .responses-inner h5,
      .swagger-ui .response-col_status { color: var(--lmaa-text); }
      .swagger-ui table.responses-table { background: transparent; }
      /* Try it out button */
      .swagger-ui .btn.try-out__btn { border-color: var(--lmaa-gold); color: var(--lmaa-gold); }
      .swagger-ui .btn.try-out__btn:hover { background: var(--lmaa-gold); color: var(--lmaa-dark); }
      .swagger-ui .btn.execute { background: var(--lmaa-gold); border-color: var(--lmaa-gold); color: var(--lmaa-dark); }
      /* Limit content width for readability */
      .swagger-ui .wrapper { max-width: 960px; margin: 0 auto; padding: 20px; }
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
        docExpansion: "list",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        filter: true,
        tryItOutEnabled: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
      });
    </script>
  </body>
</html>`);
}
