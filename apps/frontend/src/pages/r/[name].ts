import type { APIRoute } from "astro";

import { apiGetInternal } from "@/lib/api";

interface RedirectUrlResponse {
  openInNewWindow: boolean;
  targetUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function newWindowRedirectResponse(targetUrl: string): Response {
  const targetJson = JSON.stringify(targetUrl).replaceAll("<", "\\u003c");
  const targetHtml = escapeHtml(targetUrl);

  return new Response(
    `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <title>Weiterleitung</title>
</head>
<body>
  <p>Die Weiterleitung wird in einem neuen Fenster geöffnet.</p>
  <p>Falls nichts passiert, <a href="${targetHtml}" target="_blank" rel="noopener noreferrer">öffne den Link manuell</a>.</p>
  <script>
    const targetUrl = ${targetJson};
    const openedWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (openedWindow && window.history.length > 1) {
      window.history.back();
    }
  </script>
</body>
</html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    },
  );
}

export const GET: APIRoute = async ({ params }) => {
  const name = params.name;
  if (!name) {
    return new Response(null, { status: 404 });
  }

  try {
    const redirect = await apiGetInternal<RedirectUrlResponse>(
      `/internal/redirect-urls/${encodeURIComponent(name)}`,
    );
    if (redirect.openInNewWindow) {
      return newWindowRedirectResponse(redirect.targetUrl);
    }
    return Response.redirect(redirect.targetUrl, 302);
  } catch {
    return new Response(null, { status: 404 });
  }
};
