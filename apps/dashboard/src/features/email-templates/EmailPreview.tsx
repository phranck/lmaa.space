import { marked } from "marked";
import { useMemo } from "react";

marked.use({ breaks: true, gfm: true });

function applyInlineStyles(html: string): string {
  return html
    .replace(
      /<h1>/g,
      '<h1 style="font-size:22px;font-weight:600;color:#292524;margin:0 0 16px 0;line-height:1.3;">',
    )
    .replace(
      /<h2>/g,
      '<h2 style="font-size:22px;font-weight:600;color:#292524;margin:0 0 16px 0;line-height:1.3;">',
    )
    .replace(
      /<h3>/g,
      '<h3 style="font-size:17px;font-weight:600;color:#292524;margin:0 0 12px 0;line-height:1.3;">',
    )
    .replace(
      /<p>/g,
      '<p style="font-size:15px;line-height:1.6;color:#44403c;margin:0 0 16px 0;">',
    )
    .replace(/<a /g, '<a style="color:#b45309;font-weight:600;" ')
    .replace(/<strong>/g, '<strong style="color:#292524;">');
}

function parseMarkdown(text: string): string {
  const result = marked.parse(text);
  const html = typeof result === "string" ? result : "";
  return applyInlineStyles(html);
}

interface EmailPreviewProps {
  headerBannerUrl: string;
  headerText: string;
  bodyText: string;
  footerBannerUrl: string;
  footerText: string;
}

/**
 * Live email preview rendered in an isolated iframe.
 * Replicates the same HTML layout as the backend `renderEmailTemplate` function.
 */
export function EmailPreview({
  headerBannerUrl,
  headerText,
  bodyText,
  footerBannerUrl,
  footerText,
}: EmailPreviewProps) {
  const srcDoc = useMemo(() => {
    const headerHtml = headerText ? parseMarkdown(headerText) : null;
    const bodyHtml = parseMarkdown(bodyText || "");
    const footerHtml = footerText ? parseMarkdown(footerText) : null;

    const rows: string[] = [];

    if (headerBannerUrl.trim()) {
      rows.push(
        `<tr><td><img src="${headerBannerUrl}" width="560" alt="" style="display:block;width:100%;border-radius:8px 8px 0 0;"></td></tr>`,
      );
    }

    if (headerHtml) {
      rows.push(`<tr><td style="padding:32px 40px 0;">${headerHtml}</td></tr>`);
    }

    rows.push(`<tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>`);

    if (footerHtml) {
      rows.push(
        `<tr><td style="padding:0 40px 32px;border-top:1px solid #e7e5e4;"><div style="font-size:13px;color:#a8a29e;line-height:1.5;">${footerHtml}</div></td></tr>`,
      );
    }

    if (footerBannerUrl.trim()) {
      rows.push(
        `<tr><td><img src="${footerBannerUrl}" width="560" alt="" style="display:block;width:100%;border-radius:0 0 8px 8px;"></td></tr>`,
      );
    }

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;">
        ${rows.join("\n        ")}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }, [headerBannerUrl, headerText, bodyText, footerBannerUrl, footerText]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-[var(--ds-border)] shrink-0">
        <span className="text-xs font-semibold text-[var(--ds-text-muted)] uppercase tracking-wide">
          Vorschau
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe
          srcDoc={srcDoc}
          className="w-full h-full border-0"
          title="Email Vorschau"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
