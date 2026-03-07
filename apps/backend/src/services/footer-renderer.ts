import { marked } from "marked";

import type { FooterBlock, FooterConfig } from "@lmaa/contracts";

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
      return `<h3 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;">${escapeHtml(block.text)}</h3>`;

    case "text":
      return `<div style="font-size:13px;color:#aaa;line-height:1.6;">${renderMarkdown(block.markdown)}</div>`;

    case "button": {
      const label = block.label ? escapeHtml(block.label) : "";
      const icon = block.icon ? `<span style="margin-right:4px;">[${escapeHtml(block.icon)}]</span>` : "";
      const target = block.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const baseStyle = "display:inline-block;padding:6px 14px;border-radius:6px;font-size:13px;text-decoration:none;cursor:pointer;";
      let style = baseStyle;
      if (block.style === "filled") style += "background:#7c3aed;color:#fff;border:1px solid #7c3aed;";
      else if (block.style === "outline") style += "background:transparent;color:#7c3aed;border:1px solid #7c3aed;";
      else style += "background:transparent;color:#aaa;border:none;padding-left:0;";
      return `<a href="${escapeHtml(block.href)}"${target} style="${style}">${icon}${label}</a>`;
    }

    case "footer-nav": {
      if (navItems.length === 0) {
        return `<p style="font-size:12px;color:#666;margin:0;">(Footer-Nav leer)</p>`;
      }
      const links = navItems
        .map((item) => {
          const text = item.label ?? item.pageTitle ?? item.url ?? "";
          const href = item.url ?? (item.pageSlug ? `/${item.pageSlug}` : "#");
          return `<li><a href="${escapeHtml(href)}" style="color:#aaa;text-decoration:none;font-size:13px;">${escapeHtml(text)}</a></li>`;
        })
        .join("\n");
      return `<ul style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px;">${links}</ul>`;
    }
  }
}

/**
 * Generates a self-contained HTML preview of the footer configuration.
 *
 * Intended for the admin dashboard live-preview iframe. Uses inline styles
 * to match the dark footer aesthetic without requiring an external stylesheet.
 *
 * @param config   - Footer configuration to render.
 * @param navItems - Footer nav items used by `footer-nav` blocks.
 * @returns Full HTML document string.
 */
export function renderFooterPreview(config: FooterConfig, navItems: NavItems): string {
  const totalSpan = config.columns.reduce((sum, col) => sum + col.span, 0) || 1;
  const gridTemplate = config.columns.map((col) => `${col.span}fr`).join(" ");

  const columns = config.columns
    .map((col) => {
      const blocks = col.blocks.map((b) => renderBlock(b, navItems)).join("\n");
      return `<div style="display:flex;flex-direction:column;gap:12px;">${blocks}</div>`;
    })
    .join("\n");

  const gridStyle = config.columns.length > 0
    ? `display:grid;grid-template-columns:${gridTemplate};gap:32px;`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px 24px; background: #0f0f17; color: #e0e0e0; font-family: system-ui, sans-serif; }
    a { color: inherit; }
    p { margin: 0 0 8px; }
    ul, ol { padding-left: 16px; }
  </style>
</head>
<body>
  <div style="${gridStyle}">
    ${columns || '<p style="color:#555;font-size:13px;">Keine Spalten konfiguriert.</p>'}
  </div>
</body>
</html>`;
}
