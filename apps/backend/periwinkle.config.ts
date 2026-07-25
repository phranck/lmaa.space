/**
 * periwinkle configuration for the LMAA Public API reference.
 *
 * The reference is built offline by `npm run docs:build -w @lmaa/backend` and
 * served as static files from `/docs` by the backend itself.
 */

import { defineConfig } from "periwinkle";

export default defineConfig({
  spec: "openapi.generated.json",

  site: {
    title: "LMAA Public API",
    basePath: "/docs",
    serverUrl: "https://api.lmaa.space",
  },

  theme: {
    // Barlow and Barlow Condensed are periwinkle's default families, but they
    // are self-hosted here and served by the backend at /fonts, so the docs
    // load no external font stylesheet and everything stays same-origin.
    fonts: {
      stylesheets: ["/fonts/fonts.css"],
    },
    defaultMode: "light",
  },

  navigation: {
    // The llama mark is a single-color silhouette, so it is tinted with the
    // text color and works in both themes from one file.
    logo: "../frontend/src/assets/logo.png",
    logoTint: true,
    github: {
      url: "https://github.com/phranck/lmaa.space",
    },
    links: [{ label: "lmaa.space", href: "https://lmaa.space", target: "_blank" }],
  },

  guide: {
    auth: [
      "The public API needs no authentication. Every endpoint documented here is open, so a plain request without credentials works:",
      "",
      "```bash",
      "curl https://api.lmaa.space/api/v1/categories",
      "```",
      "",
      "Endpoints that require an account (the dashboard and all write operations) are deliberately left out of this reference.",
    ].join("\n"),

    requests: [
      "All responses are JSON and wrap their payload in a `data` envelope:",
      "",
      "```json",
      '{ "data": { "…": "…" } }',
      "```",
      "",
      "Read the payload from `data` rather than from the response root, so added top-level fields never break your client.",
    ].join("\n"),

    errors: [
      "Errors use the HTTP status code plus an `error` object with a human-readable message:",
      "",
      "```json",
      '{ "error": { "message": "Shop not found" } }',
      "```",
      "",
      "Treat any non-2xx status as a failure and surface `error.message`; do not parse the message text itself, as its wording can change.",
    ].join("\n"),

    rateLimits: [
      "Read endpoints allow 100 requests per minute per IP address.",
      "",
      "Every rate-limited response carries `X-RateLimit-*` headers with your current allowance. When you exceed it, the API answers with `429 Too Many Requests` — wait for the window to reset before retrying.",
    ].join("\n"),

    versioning: [
      "The API is versioned in the path. Everything documented here lives under `/api/v1`, and that prefix keeps its current behaviour.",
      "",
      "Additive changes (new endpoints, new fields) can land at any time, so ignore unknown fields instead of rejecting them. Breaking changes would ship as a new path prefix.",
    ].join("\n"),
  },

  footer: {
    links: [
      { label: "lmaa.space", href: "https://lmaa.space" },
      { label: "OpenAPI contract", href: "/openapi.json" },
    ],
    text: "LMAA — a curated directory of independent online shops in Europe.",
  },
});
