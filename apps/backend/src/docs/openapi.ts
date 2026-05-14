import { Scalar } from "@scalar/hono-api-reference";
import type { Context, MiddlewareHandler } from "hono";

import { buildOpenApiDocument } from "./openapi-document.js";

const apiReferenceCustomCss = String.raw`
@import url("/fonts/fonts.css");

:root {
  --scalar-font: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
    "Open Sans", "Helvetica Neue", sans-serif;
  --scalar-font-code: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", monospace;
  --lmaa-doc-header-height: 56px;
  --scalar-sidebar-width: 320px;
  --scalar-content-max-width: 1600px;
  --scalar-header-height: 50px;
  --scalar-radius: 3px;
  --scalar-radius-lg: 3px;
  --scalar-radius-xl: 3px;
  --theme-font: var(--scalar-font);
  --theme-radius: var(--scalar-radius);
  --theme-radius-lg: var(--scalar-radius-lg);
  --theme-radius-xl: var(--scalar-radius-xl);
}

.light-mode {
  --scalar-background-1: #fff;
  --scalar-background-2: #f7f7f7;
  --scalar-background-3: #dadada;
  --scalar-background-accent: #e0f5ff;
  --scalar-color-1: #353535;
  --scalar-color-2: #555555;
  --scalar-color-3: #aeaeae;
  --scalar-color-accent: #259dff;
  --scalar-border-color: rgba(0, 0, 0, 0.1);
  --scalar-color-green: #669900;
  --scalar-color-red: #dc4a68;
  --scalar-color-yellow: #edbe20;
  --scalar-color-blue: #0277aa;
  --scalar-color-orange: #fb892c;
  --scalar-color-purple: #5203d1;
  --scalar-link-color: #259dff;
  --scalar-link-color-hover: #1a7fd0;
  --scalar-button-1: rgb(49 53 56);
  --scalar-button-1-color: #fff;
  --scalar-button-1-hover: rgb(28 31 33);
  --lmaa-doc-header-background: #eeeeee;
  --lmaa-doc-header-color: var(--scalar-color-1);
  --lmaa-doc-header-muted-color: var(--scalar-color-2);
  --lmaa-doc-header-border-color: var(--lmaa-doc-header-background);
  --theme-color-1: var(--scalar-color-1);
  --theme-color-2: var(--scalar-color-2);
  --theme-color-3: var(--scalar-color-3);
  --theme-color-accent: var(--scalar-color-accent);
  --theme-background-1: var(--scalar-background-1);
  --theme-background-2: var(--scalar-background-2);
  --theme-background-3: var(--scalar-background-3);
  --theme-background-accent: var(--scalar-background-accent);
  --theme-border-color: var(--scalar-border-color);
}

.dark-mode {
  --scalar-background-1: #1a1a1a;
  --scalar-background-2: #252525;
  --scalar-background-3: #323232;
  --scalar-background-accent: #8ab4f81f;
  --scalar-color-1: rgba(255, 255, 255, 0.9);
  --scalar-color-2: rgba(255, 255, 255, 0.62);
  --scalar-color-3: rgba(255, 255, 255, 0.44);
  --scalar-color-accent: #8ab4f8;
  --scalar-border-color: rgba(255, 255, 255, 0.1);
  --scalar-color-green: #00b648;
  --scalar-color-red: #dc1b19;
  --scalar-color-yellow: #ffc90d;
  --scalar-color-blue: #4eb3ec;
  --scalar-color-orange: #ff8d4d;
  --scalar-color-purple: #b191f9;
  --scalar-link-color: #8ab4f8;
  --scalar-link-color-hover: #a8c7fa;
  --scalar-button-1: #f6f6f6;
  --scalar-button-1-color: #000;
  --scalar-button-1-hover: #e7e7e7;
  --lmaa-doc-header-background: #000;
  --lmaa-doc-header-color: var(--scalar-color-1);
  --lmaa-doc-header-muted-color: var(--scalar-color-2);
  --lmaa-doc-header-border-color: var(--lmaa-doc-header-background);
  --theme-color-1: var(--scalar-color-1);
  --theme-color-2: var(--scalar-color-2);
  --theme-color-3: var(--scalar-color-3);
  --theme-color-accent: var(--scalar-color-accent);
  --theme-background-1: var(--scalar-background-1);
  --theme-background-2: var(--scalar-background-2);
  --theme-background-3: var(--scalar-background-3);
  --theme-background-accent: var(--scalar-background-accent);
  --theme-border-color: var(--scalar-border-color);
}

.scalar-app h1,
.scalar-app h2,
.scalar-app h3,
.scalar-app .section-header,
.scalar-app .section-heading,
.scalar-app .client-libraries-heading {
  font-family: "Barlow Condensed", var(--scalar-font);
  letter-spacing: 0;
}

.scalar-app a,
.scalar-app .markdown a {
  color: var(--scalar-link-color);
}

.scalar-api-reference {
  --scalar-sidebar-width: 320px;
}

.scalar-api-reference::before {
  content: "LMAA Public API";
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 50;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: var(--lmaa-doc-header-height);
  padding: 0 20px;
  border-bottom: 1px solid var(--lmaa-doc-header-border-color);
  background: var(--lmaa-doc-header-background);
  color: var(--lmaa-doc-header-color);
  font-family: "Barlow Condensed", var(--scalar-font);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0;
}

.scalar-api-reference::after {
  content: "lmaa.space";
  position: fixed;
  top: 0;
  right: 20px;
  z-index: 51;
  display: flex;
  align-items: center;
  height: var(--lmaa-doc-header-height);
  color: var(--lmaa-doc-header-muted-color);
  font-size: 0.86rem;
  font-weight: 500;
}

.sidebar-heading-type {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-width: 2.65rem;
  height: 1.2rem !important;
  margin-top: 0;
  padding: 0 0.5rem !important;
  border: 1px solid var(--method-color, var(--scalar-color-blue));
  border-radius: 999px;
  background: color-mix(in srgb, var(--method-color, var(--scalar-color-blue)) 14%, transparent);
  color: var(--method-color, var(--scalar-color-blue)) !important;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  box-shadow: none;
}

.sidebar-heading-type--get {
  --method-color: var(--scalar-color-blue) !important;
}

.sidebar-heading-type--post {
  --method-color: var(--scalar-color-green) !important;
}

.sidebar-heading-type--put {
  --method-color: var(--scalar-color-orange) !important;
}

.sidebar-heading-type--patch {
  --method-color: var(--scalar-color-yellow) !important;
}

.sidebar-heading-type--delete {
  --method-color: var(--scalar-color-red) !important;
}

.request-method {
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.16rem 0.45rem;
  letter-spacing: 0;
}

.request-method--get {
  background: color-mix(in srgb, var(--scalar-color-blue) 14%, transparent);
  color: var(--scalar-color-blue);
}

.request-method--post {
  background: color-mix(in srgb, var(--scalar-color-green) 14%, transparent);
  color: var(--scalar-color-green);
}

.request-method--put {
  background: color-mix(in srgb, var(--scalar-color-orange) 14%, transparent);
  color: var(--scalar-color-orange);
}

.request-method--patch {
  background: color-mix(in srgb, var(--scalar-color-yellow) 14%, transparent);
  color: var(--scalar-color-yellow);
}

.request-method--delete {
  background: color-mix(in srgb, var(--scalar-color-red) 14%, transparent);
  color: var(--scalar-color-red);
}

.client-libraries {
  gap: 0.55rem;
  padding-block: 0.55rem;
}

.client-libraries [class*="client-libraries-icon__"] {
  width: 1.45rem;
  height: 1.45rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.client-libraries-icon {
  width: 100%;
  height: 100%;
}

.client-libraries-icon__shell {
  color: var(--scalar-color-orange);
}

.client-libraries-icon__c {
  color: var(--scalar-color-blue);
}

.client-libraries-icon__node {
  color: var(--scalar-color-green);
}

.client-libraries-icon__php {
  color: var(--scalar-color-purple);
}

.client-libraries-icon__python {
  color: var(--scalar-color-blue);
}

.client-libraries-icon__ruby {
  color: var(--scalar-color-red);
}

.client-libraries-icon__rust {
  color: var(--scalar-color-orange);
}

.client-libraries-icon__swift {
  color: var(--scalar-color-red);
}

.client-libraries-icon__objc,
.client-libraries-icon__objective-c {
  color: var(--scalar-color-purple);
}
`;

const scalarApiReference = Scalar({
  url: "/openapi.json",
  pageTitle: "LMAA Public API",
  layout: "modern",
  theme: "none",
  darkMode: true,
  hideDarkModeToggle: false,
  withDefaultFonts: false,
  customCss: apiReferenceCustomCss,
  hiddenClients: {
    clojure: true,
    csharp: true,
    dart: true,
    fsharp: true,
    go: true,
    http: true,
    java: true,
    js: true,
    javascript: true,
    kotlin: true,
    ocaml: true,
    powershell: true,
    r: true,
    node: ["axios", "ofetch"],
    python: ["httpx_async", "httpx_sync", "python3"],
  },
  defaultHttpClient: {
    targetKey: "shell",
    clientKey: "curl",
  },
});

const apiReferenceContentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  "img-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' https://lmaa.space https://api.lmaa.space",
  "frame-ancestors 'none'",
].join("; ");

/** Hono handler that serves the generated OpenAPI 3.1 JSON document. */
export function serveOpenApiJson(c: Context) {
  c.header("Cache-Control", "no-store");
  return c.json(buildOpenApiDocument());
}

/** Hono handler that serves the Scalar API Reference for the generated OpenAPI document. */
export const serveApiReference: MiddlewareHandler = async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Content-Security-Policy", apiReferenceContentSecurityPolicy);
  return scalarApiReference(c, next);
};
