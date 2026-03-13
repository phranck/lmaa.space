import type { Context } from "hono";

function getOpenApiServers() {
  return [{ url: "https://lmaa.space", description: "Production" }];
}

const OPEN_API_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "LMAA API",
    version: "1.0.0",
    description: [
      "Public REST API for [lmaa.space](https://lmaa.space) -- a curated directory of independent online shops as alternatives to large platforms and marketplaces in Europe.",
      "",
      "## Overview",
      "",
      "This API provides read-only access to the lmaa.space shop catalog, categories, and public statistics. All endpoints return JSON wrapped in a `{ \"data\": ... }` envelope. Errors use a `{ \"error\": { \"message\": \"...\" } }` envelope.",
      "",
      "No authentication is required. The API is intended for integrations, research, and community tools.",
      "",
      "## Rate Limiting",
      "",
      "All endpoints are rate-limited to **100 requests per minute** per IP address. When the limit is exceeded, the API responds with `429 Too Many Requests`. The following headers are included in every response:",
      "",
      "| Header | Description |",
      "|--------|-------------|",
      "| `X-RateLimit-Limit` | Maximum requests allowed in the current window |",
      "| `X-RateLimit-Remaining` | Requests remaining in the current window |",
      "| `X-RateLimit-Reset` | Unix timestamp when the window resets |",
      "| `Retry-After` | Seconds to wait before retrying (only on 429) |",
      "",
      "## Caching",
      "",
      "Most responses include `Cache-Control` headers. Shops and stats are cached for 60 seconds, categories for 30 seconds. Clients should respect these headers to reduce unnecessary requests.",
      "",
      "## Contact",
      "",
      "Questions, bug reports, or feature requests: [GitHub Issues](https://github.com/phranck/lmaa.space/issues) or [hallo@lmaa.space](mailto:hallo@lmaa.space).",
    ].join("\n"),
    contact: {
      name: "LMAA",
      url: "https://lmaa.space",
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
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
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
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
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
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
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
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
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
          "429": {
            description: "Rate limit exceeded",
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
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
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
          "429": {
            description: "Rate limit exceeded",
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
        /* Dashboard dark mode tokens (OKLCH) */
        --bg: oklch(0.21 0.006 250);
        --surface: oklch(0.225 0.006 250);
        --elevated: oklch(0.25 0.006 250);
        --text: oklch(0.95 0.006 250);
        --text-muted: oklch(0.65 0.006 250);
        --text-subtle: oklch(0.5 0.006 250);
        --border: #3d444d;
        --border-subtle: rgba(61, 68, 77, 0.7);
        --accent: #00aef1;
        --accent-hover: #0099d4;
        --brand: oklch(0.754 0.136 92);
        --success: #57ab5a;
        --danger: #e5534b;
        --warning: #c69026;
        --info: #539bf5;
        --font: "Barlow", system-ui, -apple-system, sans-serif;
        --font-heading: "Barlow Condensed", "Barlow", system-ui, sans-serif;
      }

      html { font-size: 20px; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        color-scheme: dark;
        -webkit-font-smoothing: antialiased;
        font-kerning: normal;
        text-rendering: optimizeLegibility;
      }

      /* ── Base font ───────────────────────────────── */
      .swagger-ui,
      .swagger-ui .info .title,
      .swagger-ui .opblock-tag,
      .swagger-ui section.models h4,
      .swagger-ui .responses-inner h4,
      .swagger-ui .responses-inner h5,
      .swagger-ui .info .description h2 {
        font-family: var(--font-heading);
      }

      /* ── Hide topbar + server selector ───────────── */
      .topbar,
      .swagger-ui .scheme-container { display: none; }

      /* ── Layout ──────────────────────────────────── */
      .swagger-ui .wrapper {
        max-width: 1120px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
        background: var(--bg);
      }
      .swagger-ui { background: var(--bg); }

      /* ── Info header ─────────────────────────────── */
      .swagger-ui .info { margin: 1.5rem 0 2.5rem; }
      .swagger-ui .info .title { color: var(--text); font-weight: 700; font-size: 2rem; }
      .swagger-ui .info .description,
      .swagger-ui .info .description p { color: var(--text-muted); font-size: 1rem; line-height: 1.6; }
      .swagger-ui .info .description h2 { color: var(--text); font-size: 1.35rem; font-weight: 600; margin-top: 2rem; font-family: var(--font-heading); }
      .swagger-ui .info .description strong { color: var(--text); }
      .swagger-ui code,
      .swagger-ui .info .description code,
      .swagger-ui .response-col_description code,
      .swagger-ui .opblock-description-wrapper code,
      .swagger-ui .parameter__name code {
        background: oklch(0.3 0.006 250) !important;
        color: #05aef1 !important;
        padding: 0.08em 0.4em !important;
        border-radius: 6px !important;
        font-size: 0.88em;
        font-weight: 400;
      }
      .swagger-ui .info .description table {
        margin: 1rem 0;
        width: 100% !important;
        display: table !important;
        border: none;
        border-collapse: collapse;
        border-radius: 8px;
        outline: 1px solid var(--border);
        outline-offset: -1px;
        -webkit-clip-path: inset(0 round 8px);
        clip-path: inset(0 round 8px);
      }
      .swagger-ui .info .description table th,
      .swagger-ui .info .description table td {
        padding: 0.5rem 0.75rem;
        text-align: left;
        font-size: 1rem;
        border: none;
        border-bottom: 1px solid var(--border);
      }
      .swagger-ui .info .description table tr:last-child td { border-bottom: none; }
      .swagger-ui .info .description table th {
        color: var(--text);
        font-weight: 600;
        background: var(--elevated);
      }
      .swagger-ui .info .description table td { color: var(--text-muted); }
      .swagger-ui .info a { color: var(--accent); }
      .swagger-ui .info a:hover { color: var(--accent-hover); }

      /* ── Version + OAS badge ─────────────────────── */
      .swagger-ui .info .title small { background: var(--surface); }
      .swagger-ui .info .title small.version-stamp { background: var(--accent); color: #fff; }
      .swagger-ui .info .title small pre.version { padding: 0; }

      /* ── Tag groups ──────────────────────────────── */
      .swagger-ui .opblock-tag {
        color: var(--text);
        font-size: 1.2rem;
        font-weight: 600;
        border-bottom: 1px solid var(--border);
        padding: 0.75rem 0;
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
        align-items: center;
      }
      .swagger-ui .opblock-tag:hover { background: var(--surface); }
      .swagger-ui .opblock-tag small {
        color: var(--text-muted);
        font-size: 0.9rem;
        grid-column: 1;
        grid-row: 2;
        padding-top: 0.25rem;
      }
      .swagger-ui .opblock-tag svg {
        fill: var(--text-muted);
        grid-column: 2;
        grid-row: 1;
      }

      /* ── Operation blocks ────────────────────────── */
      .swagger-ui .opblock { background: var(--surface); border-color: var(--border); border-radius: 8px; margin-bottom: 0.75rem; }
      .swagger-ui .opblock .opblock-summary { padding: 0.5rem 0.75rem; }
      .swagger-ui .opblock .opblock-summary-path { color: var(--text); font-size: 0.95rem; }
      .swagger-ui .opblock .opblock-summary-path__deprecated { color: var(--text-subtle); }
      .swagger-ui .opblock .opblock-summary-description { color: var(--text-muted); font-size: 0.88rem; }
      .swagger-ui .opblock .opblock-summary-operation-id { color: var(--text-subtle); font-size: 0.82rem; }

      /* GET */
      .swagger-ui .opblock.opblock-get { border-color: rgba(83, 155, 245, 0.3); background: rgba(83, 155, 245, 0.06); }
      .swagger-ui .opblock.opblock-get .opblock-summary-method { background: var(--info); color: #fff; font-weight: 600; border-radius: 4px; font-size: 0.82rem; }
      .swagger-ui .opblock.opblock-get .opblock-summary { border-color: rgba(83, 155, 245, 0.15); }
      /* POST */
      .swagger-ui .opblock.opblock-post { border-color: rgba(87, 171, 90, 0.3); background: rgba(87, 171, 90, 0.06); }
      .swagger-ui .opblock.opblock-post .opblock-summary-method { background: var(--success); color: #fff; font-weight: 600; border-radius: 4px; font-size: 0.82rem; }
      /* PUT */
      .swagger-ui .opblock.opblock-put { border-color: rgba(198, 144, 38, 0.3); background: rgba(198, 144, 38, 0.06); }
      .swagger-ui .opblock.opblock-put .opblock-summary-method { background: var(--warning); color: #fff; font-weight: 600; border-radius: 4px; font-size: 0.82rem; }
      /* DELETE */
      .swagger-ui .opblock.opblock-delete { border-color: rgba(229, 83, 75, 0.3); background: rgba(229, 83, 75, 0.06); }
      .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: var(--danger); color: #fff; font-weight: 600; border-radius: 4px; font-size: 0.82rem; }

      /* Expanded operation body */
      .swagger-ui .opblock-body { background: var(--bg); }
      .swagger-ui .opblock-body pre.microlight {
        background: var(--surface) !important;
        color: var(--text) !important;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.8rem !important;
        line-height: 1.5;
        padding: 1rem;
      }
      .swagger-ui .opblock-body pre.microlight span,
      .swagger-ui .opblock-body pre.microlight code {
        background: transparent !important;
        font-size: 0.8rem !important;
      }
      .swagger-ui .opblock-section-header { background: #1d2631 !important; border-color: var(--border) !important; }
      .swagger-ui .opblock-section-header h4 { color: var(--text) !important; font-size: 0.95rem; }
      .swagger-ui .opblock-section-header label { color: var(--text) !important; }
      .swagger-ui .opblock-body .opblock-section { background: transparent; }
      .swagger-ui .table-container { background: transparent; }
      .swagger-ui .responses-wrapper { background: transparent; }
      .swagger-ui .no-margin .opblock-description-wrapper { background: transparent !important; color: var(--text-muted); }

      /* ── Parameters ──────────────────────────────── */
      .swagger-ui .opblock-description-wrapper p,
      .swagger-ui .opblock-external-docs-wrapper p { color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; }
      .swagger-ui table thead tr td,
      .swagger-ui table thead tr th { color: var(--text-muted); font-size: 0.85rem; border-color: var(--border); }
      .swagger-ui .parameter__name { color: var(--text); font-size: 0.92rem; }
      .swagger-ui .parameter__name.required::after { color: var(--danger); }
      .swagger-ui .parameter__type { color: var(--accent); font-size: 0.85rem; }
      .swagger-ui .parameter__in { color: var(--text-subtle); font-size: 0.82rem; }
      .swagger-ui .parameter__extension,
      .swagger-ui .parameter__deprecated { color: var(--warning); }

      /* ── Responses ───────────────────────────────── */
      .swagger-ui .responses-inner h4,
      .swagger-ui .responses-inner h5 { color: var(--text); font-size: 0.95rem; }
      .swagger-ui .response-col_status { color: var(--text); font-size: 0.92rem; }
      .swagger-ui .response-col_description { color: var(--text-muted); font-size: 0.92rem; }
      .swagger-ui .response-col_description__inner p { color: var(--text-muted); }
      .swagger-ui table.responses-table { background: transparent; }
      .swagger-ui .responses-table thead td { color: var(--text-muted); border-color: var(--border); }

      /* ── Models / Schemas ────────────────────────── */
      .swagger-ui section.models { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }
      .swagger-ui section.models h4 { color: var(--text); font-size: 1rem; }
      .swagger-ui section.models h4 svg { fill: var(--text-muted); }
      .swagger-ui .model-title { color: var(--text) !important; }
      .swagger-ui .model { color: var(--text-muted); }
      .swagger-ui .opblock-body,
      .swagger-ui .opblock-body *,
      .swagger-ui .model,
      .swagger-ui .model *,
      .swagger-ui section.models,
      .swagger-ui section.models * { font-size: 1rem !important; font-weight: 400 !important; }
      .swagger-ui .model .prop-type,
      .swagger-ui .model-title__text + span,
      .swagger-ui .model span[class*="type"] { color: var(--accent) !important; }
      .swagger-ui .model-toggle::after { background: var(--text-muted); }
      .swagger-ui .prop-type { color: var(--accent); }
      .swagger-ui .prop-format { color: var(--text-subtle); }
      .swagger-ui span.model-title__text { color: var(--text) !important; background: transparent !important; }
      .swagger-ui .model-box { background: var(--bg); }
      .swagger-ui section.models .model-container { background: var(--surface); border-color: var(--border); }
      .swagger-ui .models-control .model-box-control,
      .swagger-ui .model-box-control { background: transparent !important; }
      .swagger-ui .model-title img { display: none; }
      /* Schema name badges */
      .swagger-ui span.model-title__text,
      .swagger-ui .models section.model .model-title {
        background: transparent !important;
        color: var(--text) !important;
        font-weight: 600;
      }
      .swagger-ui .model-hint { color: var(--text-subtle); }
      /* Expand all link */
      .swagger-ui .models-control { color: var(--text-muted); }
      .swagger-ui .models .models-control a { color: var(--text-muted); }
      /* Expanded schema properties */
      .swagger-ui .model .property { color: var(--text); font-size: 1rem; }
      .swagger-ui .model .property.primitive { color: var(--accent); }
      /* Schema property names */
      .swagger-ui table.model tr.property-row td:first-child,
      .swagger-ui .model span { font-size: 1rem; }
      .swagger-ui .model .prop-name { color: var(--text) !important; }
      .swagger-ui .model .prop-type { color: var(--accent) !important; }
      .swagger-ui .model .prop-format { color: var(--text-muted) !important; }
      /* Required star */
      .swagger-ui .model .star { color: var(--accent) !important; }
      /* Constraint badges (uri, ≥ 0, etc.) */
      .swagger-ui .model .prop-enum,
      .swagger-ui .model span.prop-format {
        background: var(--elevated) !important;
        color: var(--text-muted) !important;
        font-size: 0.88rem;
      }
      /* "Collapse all" / "Expand all" text */
      .swagger-ui .model .model-toggle { color: var(--text-muted); font-size: 1rem; }
      /* "Example Value | Schema" tabs */
      .swagger-ui .tab li { color: var(--text-muted) !important; font-size: 1rem; }
      .swagger-ui .tab li.active { color: var(--text) !important; }
      .swagger-ui .tab li button.tablinks { color: inherit !important; font-size: 1rem; background: transparent; }
      /* Schema title in response body */
      .swagger-ui .model-title__text { font-size: 1rem; }

      /* ── Buttons ─────────────────────────────────── */
      .swagger-ui .btn {
        font-family: var(--font);
        font-size: 0.85rem;
        border-radius: 6px;
        transition: all 150ms ease;
      }
      .swagger-ui .btn.try-out__btn {
        border: 1px solid #007db1;
        color: #007db1;
        background: transparent;
      }
      .swagger-ui .btn.try-out__btn:hover {
        background: #007db1;
        color: #fff;
      }
      .swagger-ui .btn.execute {
        background: #007db1;
        border-color: #007db1;
        color: #fff;
        font-weight: 600;
      }
      .swagger-ui .btn.execute:hover { background: #006a96; }
      .swagger-ui .btn.cancel { border-color: var(--border); color: var(--text-muted); }
      .swagger-ui .btn.authorize { border-color: var(--success); color: var(--success); }

      /* ── Inputs ──────────────────────────────────── */
      .swagger-ui input[type=text],
      .swagger-ui textarea,
      .swagger-ui select {
        background: var(--bg);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-family: var(--font);
        font-size: 0.88rem;
        padding: 0.5rem 0.6rem;
      }
      .swagger-ui input[type=text]:focus,
      .swagger-ui textarea:focus,
      .swagger-ui select:focus {
        border-color: var(--accent);
        outline: none;
        box-shadow: 0 0 0 2px rgba(0, 174, 241, 0.2);
      }
      .swagger-ui select { color: var(--text); }
      .swagger-ui select option { background: var(--surface); color: var(--text); }

      /* ── Filter bar ──────────────────────────────── */
      .swagger-ui .filter-container { background: var(--bg); margin: 0 0 1.5rem; }
      .swagger-ui .filter-container .operation-filter-input {
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text);
        border-radius: 6px;
        font-size: 0.92rem;
        padding: 0.6rem 0.75rem;
      }

      /* ── Scrollbar ───────────────────────────────── */
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: var(--bg); }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--text-subtle); }

      /* ── Links ────────────────────────────────────── */
      .swagger-ui a { color: var(--accent); text-decoration: none; font-size: inherit !important; }
      .swagger-ui a:hover { color: var(--accent-hover); text-decoration: underline; }
      .swagger-ui .info .base-url,
      .swagger-ui .info .info__contact,
      .swagger-ui .info .info__contact a,
      .swagger-ui .info .info__extdocs,
      .swagger-ui .info .info__extdocs a { font-size: 1rem !important; }

      /* ── Misc ─────────────────────────────────────── */
      .swagger-ui .loading-container .loading::after { color: var(--text-muted); }
      .swagger-ui .response-control-media-type__accept-message { color: var(--success); }
      .swagger-ui .download-contents { color: var(--accent); }
      .swagger-ui .copy-to-clipboard { background: var(--elevated); }
      .swagger-ui .copy-to-clipboard button { background: var(--elevated); }
      .swagger-ui .arrow { fill: var(--text-muted); }
      .swagger-ui svg.arrow { fill: var(--text-muted); }
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
        defaultModelsExpandDepth: -1,
        defaultModelExpandDepth: 1,
        filter: false,
        tryItOutEnabled: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
      });
    </script>
  </body>
</html>`);
}
