import { marked } from "marked";

import type { EmailTemplate } from "../db/schema.js";
import { escapeHtml } from "../lib/html.js";

marked.use({ breaks: true, gfm: true });

const VAR_REGEX = /\{\{(\w+)\}\}/g;

/** Dark mode rules as plain CSS (no @media wrapper). Used directly in previews. */
const DARK_RULES = `
  body,
  .em-body,
  table.em-page,
  td.em-page-cell             { background: #1c1917 !important; background-color: #1c1917 !important; }
  table.em-container          { background: #292524 !important; border-color: #44403c !important; }
  h1, h2, h3                  { color: #fafaf9 !important; }
  p                           { color: #d6d3d1 !important; }
  a                           { color: #fcd34d !important; }
  strong                      { color: #fafaf9 !important; }
  .em-footer-border           { border-top-color: #44403c !important; }
  .em-footer-text,
  .em-footer-text p           { color: #78716c !important; }
`;

const COLOR_SCHEME_CSS = `
  :root {
    color-scheme: light dark;
    supported-color-schemes: light dark;
  }
`;

/**
 * CSS injected into real emails — wraps dark rules in a @media query so email
 * clients apply them automatically based on the user's OS setting.
 */
const DARK_MODE_CSS = `${COLOR_SCHEME_CSS}@media (prefers-color-scheme: dark) {${DARK_RULES}}`;

function interpolate(text: string, variables: Record<string, string>): string {
  return text.replace(new RegExp(VAR_REGEX.source, "g"), (_, name) =>
    escapeHtml(variables[name] ?? ""),
  );
}

// Private-use placeholders that survive Markdown rendering untouched.
const PLACEHOLDER_OPEN = String.fromCharCode(0xe000);
const PLACEHOLDER_CLOSE = String.fromCharCode(0xe001);

/**
 * Renders a Markdown template field while keeping interpolated variables inert.
 *
 * @param text - Markdown template (admin-authored) containing `{{var}}` slots.
 * @param variables - Values to substitute (may be user-supplied).
 * @returns Rendered HTML with each variable as escaped plain text.
 *
 * @remarks
 * Escaping Markdown metacharacters is NOT enough: `marked` runs with `gfm`, which
 * autolinks bare URLs / emails / `www.` hosts — none of which use those
 * metacharacters — so a pasted `https://evil.example` would still become a live
 * phishing link in the owner notification email. Instead each value is replaced
 * by a placeholder, the template is rendered, and the placeholders are then
 * swapped for the HTML-escaped plain-text values. Neither Markdown syntax nor
 * autolinking can therefore apply to user input. Substitution is a single pass,
 * so a placeholder appearing inside a value is never re-expanded.
 *
 * The placeholder characters (U+E000 / U+E001, Private Use Area) were chosen so
 * they survive Markdown parsing: `marked` considers them plain text and passes
 * them through to the HTML output unmodified — **except inside `href` attributes,
 * where it URL-encodes them** because non-ASCII bytes are invalid in URLs. The
 * replacement regex must therefore match both the raw PUA bytes and their
 * percent-encoded form (`%EE%80%80` / `%EE%80%81`) so that variables used in
 * Markdown link targets (e.g. `[Text]({{url}})`) are correctly substituted.
 */
function interpolateMarkdown(text: string, variables: Record<string, string>): string {
  const values: string[] = [];
  const withPlaceholders = text.replace(new RegExp(VAR_REGEX.source, "g"), (_, name) => {
    const index = values.push(escapeHtml(variables[name] ?? "")) - 1;
    return `${PLACEHOLDER_OPEN}${index}${PLACEHOLDER_CLOSE}`;
  });
  const html = parseMarkdown(withPlaceholders);
  const escOpen = encodeURIComponent(PLACEHOLDER_OPEN);
  const escClose = encodeURIComponent(PLACEHOLDER_CLOSE);
  return html.replace(
    new RegExp(`(?:${PLACEHOLDER_OPEN}|${escOpen})(\\d+)(?:${PLACEHOLDER_CLOSE}|${escClose})`, "g"),
    (_, index) => values[Number(index)] ?? "",
  );
}

/**
 * Adds email-safe inline styles to the predictable HTML output of `marked`.
 */
function applyInlineStyles(html: string): string {
  return html
    .replace(
      /<h1>/g,
      '<h1 style="font-size:22px;font-weight:600;color:#292524;margin:0 0 16px 0;line-height:1.3;">',
    )
    .replace(
      /<h2>/g,
      '<h2 style="font-size:18px;font-weight:600;color:#292524;margin:0 0 12px 0;line-height:1.3;">',
    )
    .replace(/<p>/g, '<p style="font-size:15px;line-height:1.6;color:#44403c;margin:0 0 16px 0;">')
    .replace(/<a /g, '<a style="color:#b45309;font-weight:600;" ')
    .replace(/<strong>/g, '<strong style="color:#292524;">');
}

function parseMarkdown(text: string): string {
  const result = marked.parse(text);
  const html = typeof result === "string" ? result : "";
  return applyInlineStyles(html);
}

type TemplateFields = {
  headerBannerUrl?: string | null;
  headerText?: string | null;
  bodyText: string;
  footerText?: string | null;
  footerBannerUrl?: string | null;
};

function buildRows(fields: TemplateFields, variables: Record<string, string>): string[] {
  const headerHtml = fields.headerText ? interpolateMarkdown(fields.headerText, variables) : null;
  const bodyHtml = interpolateMarkdown(fields.bodyText, variables);
  const footerHtml = fields.footerText ? interpolateMarkdown(fields.footerText, variables) : null;

  const rows: string[] = [];

  if (fields.headerBannerUrl) {
    rows.push(
      `<tr><td><img src="${fields.headerBannerUrl}" width="560" alt="" style="display:block;width:100%;border-radius:8px 8px 0 0;"></td></tr>`,
    );
  }
  if (headerHtml) {
    rows.push(`<tr><td style="padding:32px 40px 0;">${headerHtml}</td></tr>`);
  }
  rows.push(`<tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>`);
  if (footerHtml) {
    rows.push(
      `<tr><td class="em-footer-border" style="padding:24px 40px;border-top:1px solid #e7e5e4;text-align:center;"><div class="em-footer-text" style="font-size:13px;color:#a8a29e;line-height:1.5;">${footerHtml}</div></td></tr>`,
    );
  }
  if (fields.footerBannerUrl) {
    rows.push(
      `<tr><td><img src="${fields.footerBannerUrl}" width="560" alt="" style="display:block;width:100%;border-radius:0 0 8px 8px;"></td></tr>`,
    );
  }

  return rows;
}

function buildEmailHtml(rows: string[], css: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${css}</style>
</head>
<body class="em-body" style="margin:0;padding:0;background:#f5f5f4;background-color:#f5f5f4;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table class="em-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;background-color:#f5f5f4;">
    <tr><td class="em-page-cell" align="center" style="padding:40px 16px;background:#f5f5f4;background-color:#f5f5f4;">
      <table class="em-container" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;">
        ${rows.join("\n        ")}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Renders an `EmailTemplate` with the given variable values into a complete
 * HTML email string and an interpolated subject line.
 *
 * Unknown `{{varName}}` placeholders are replaced with an empty string.
 * The generated HTML includes a `@media (prefers-color-scheme: dark)` block
 * so recipients automatically receive a dark-mode adapted version.
 */
export async function renderEmailTemplate(
  template: EmailTemplate,
  variables: Record<string, string>,
): Promise<{ html: string; subject: string }> {
  const subject = interpolate(template.subject, variables);
  const rows = buildRows(template, variables);
  return { html: buildEmailHtml(rows, DARK_MODE_CSS), subject };
}

/**
 * Representative sample values for the known template variables. Used to fill a
 * template for a test send so the rendered email looks complete rather than
 * showing blank slots where the variables would be.
 */
const SAMPLE_TEMPLATE_VARIABLES: Record<string, string> = {
  shopName: "Beispiel-Shop",
  shopUrl: "https://beispiel-shop.de",
  username: "maxmustermann",
  password: "Xy7!Beispiel",
  loginUrl: "https://lmaa.space/dashboard",
  dashboardUrl: "https://lmaa.space/dashboard",
  region: "Berlin",
  reportCount: "3",
  rejectionUrl: "https://lmaa.space/shops/beispiel-shop",
  reminderMessage: "Bitte prüfe die Öffnungszeiten dieses Shops.",
  submitterNote: "Toller lokaler Laden, bitte aufnehmen!",
};

/**
 * Builds a variable map filled with representative sample values for every
 * `{{placeholder}}` used anywhere in the template (subject, header, body,
 * footer). Known variables get a realistic value; unknown ones fall back to
 * their own name so the slot stays visible. Used for admin test sends.
 *
 * @param template - The email template to scan for placeholders.
 * @returns A record mapping each referenced variable name to a sample value.
 */
export function sampleVariablesForTemplate(template: EmailTemplate): Record<string, string> {
  const haystack = [template.subject, template.headerText, template.bodyText, template.footerText]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  const variables: Record<string, string> = {};
  for (const match of haystack.matchAll(new RegExp(VAR_REGEX.source, "g"))) {
    const name = match[1];
    variables[name] = SAMPLE_TEMPLATE_VARIABLES[name] ?? name;
  }
  return variables;
}

/**
 * Renders a preview of template fields for the dashboard.
 *
 * Unlike `renderEmailTemplate`, this does not use a `@media` query —
 * the color scheme is applied directly so the iframe preview reflects
 * the manually selected theme, independent of the user's OS setting.
 */
export function renderEmailPreview(fields: TemplateFields, colorScheme: "light" | "dark"): string {
  const rows = buildRows(fields, {});
  return buildEmailHtml(rows, `${COLOR_SCHEME_CSS}${colorScheme === "dark" ? DARK_RULES : ""}`);
}
