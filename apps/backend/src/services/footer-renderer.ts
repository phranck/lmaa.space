import { marked } from "marked";

import type { FooterBlock, FooterConfig } from "@lmaa/contracts";
import { FOOTER_STYLES_CSS, footerStyleVars } from "@lmaa/shared";

import { escapeHtml } from "../lib/html.js";
import type { listPublicNavItems } from "../repositories/public.js";

marked.use({ breaks: true, gfm: true });

type NavItems = Awaited<ReturnType<typeof listPublicNavItems>>;

function renderMarkdown(text: string): string {
  const result = marked.parse(text);
  return typeof result === "string" ? result : "";
}

function renderBlock(block: FooterBlock, navItems: NavItems): string {
  switch (block.type) {
    case "headline":
      return `<p class="footer-headline">${escapeHtml(block.text)}</p>`;

    case "text":
      return `<div class="footer-text">${renderMarkdown(block.markdown)}</div>`;

    case "button": {
      const label = block.label ? escapeHtml(block.label) : "";
      const target = block.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const styleClass = `footer-btn footer-btn-${block.style}`;
      return `<a href="${escapeHtml(block.href)}"${target} class="${styleClass}">${label}</a>`;
    }

    case "separator":
      return `<hr class="footer-separator" />`;

    case "footer-nav": {
      if (navItems.length === 0) {
        return `<p class="footer-headline">(Footer-Nav leer)</p>`;
      }
      const listClass = block.direction === "horizontal" ? "footer-nav footer-nav-h" : "footer-nav";
      const links = navItems
        .map((item) => {
          const text = item.label ?? item.pageTitle ?? item.url ?? "";
          const href = item.url ?? (item.pageSlug ? `/${item.pageSlug}` : "#");
          return `<li><a href="${escapeHtml(href)}">${escapeHtml(text)}</a></li>`;
        })
        .join("\n");
      return `<ul class="${listClass}">${links}</ul>`;
    }
  }
}

/**
 * Generates a self-contained HTML preview of the footer configuration.
 *
 * Uses the shared `FOOTER_STYLES_CSS` from `@lmaa/ui` so the preview
 * matches the actual website footer exactly.
 *
 * @param config   - Footer configuration to render.
 * @param navItems - Footer nav items used by `footer-nav` blocks.
 * @returns Full HTML document string.
 */
export function renderFooterPreview(config: FooterConfig, navItems: NavItems): string {
  const gridTemplate = config.columns.map((col) => `${col.span}fr`).join(" ");

  const columns = config.columns
    .map(
      (col) =>
        `<div class="footer-col" style="--col-span:${col.span}">${col.blocks.map((b) => renderBlock(b, navItems)).join("\n")}</div>`,
    )
    .join("\n");

  const totalSpan = config.columns.reduce((sum, col) => sum + col.span, 0) || 1;
  const gridStyle = config.columns.length > 0
    ? `grid-template-columns:${gridTemplate};`
    : "";

  const styleVars = footerStyleVars(config.style);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <style>
    * { box-sizing: border-box; }
    html { font-size: 18px; line-height: 1.5; }
    body { margin: 0; font-family: "Inter", system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; line-height: inherit; }
    ${FOOTER_STYLES_CSS}
  </style>
</head>
<body>
  <footer class="footer-root" style="${styleVars}">
    <div class="footer-inner">
      <div class="footer-grid" style="--footer-cols:${totalSpan};${gridStyle}">
        ${columns || '<p class="footer-headline" style="color:#555">Keine Spalten konfiguriert.</p>'}
      </div>
    </div>
  </footer>
</body>
</html>`;
}
