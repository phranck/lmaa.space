import type { Context } from "hono";

import { buildOpenApiDocument } from "./openapi-document.js";

/** Hono handler that serves the generated OpenAPI 3.1 JSON document. */
export function serveOpenApiJson(c: Context) {
  c.header("Cache-Control", "no-store");
  return c.json(buildOpenApiDocument());
}

/** Hono handler that serves Swagger UI pointing at the generated OpenAPI document. */
export function serveSwaggerUi(c: Context) {
  c.header("Cache-Control", "no-store");
  c.header(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
  );

  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LMAA Public API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #171b22;
        --surface: #202733;
        --text: #eef2f7;
        --muted: #9aa7b6;
        --border: #3d4654;
        --accent: #00aef1;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .topbar,
      .swagger-ui .scheme-container {
        display: none;
      }

      .swagger-ui {
        background: var(--bg);
      }

      .swagger-ui .wrapper {
        max-width: 1120px;
        padding: 32px 24px;
      }

      .swagger-ui .info .title,
      .swagger-ui .opblock-tag,
      .swagger-ui section.models h4,
      .swagger-ui .responses-inner h4,
      .swagger-ui .responses-inner h5 {
        color: var(--text);
      }

      .swagger-ui .info .description,
      .swagger-ui .info .description p,
      .swagger-ui .opblock-description-wrapper p,
      .swagger-ui .response-col_description,
      .swagger-ui table thead tr td,
      .swagger-ui table thead tr th {
        color: var(--muted);
      }

      .swagger-ui .opblock,
      .swagger-ui section.models {
        background: var(--surface);
        border-color: var(--border);
        border-radius: 8px;
      }

      .swagger-ui .opblock .opblock-summary-path,
      .swagger-ui .parameter__name,
      .swagger-ui .response-col_status,
      .swagger-ui .model-title,
      .swagger-ui .model .prop-name {
        color: var(--text) !important;
      }

      .swagger-ui .parameter__type,
      .swagger-ui .prop-type,
      .swagger-ui a {
        color: var(--accent) !important;
      }

      .swagger-ui input[type=text],
      .swagger-ui textarea,
      .swagger-ui select {
        background: var(--bg);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 6px;
      }
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
        filter: true,
        tryItOutEnabled: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout"
      });
    </script>
  </body>
</html>`);
}
