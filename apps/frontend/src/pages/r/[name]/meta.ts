import type { APIRoute } from "astro";

import { apiGetInternal } from "@/lib/api";

interface RedirectUrlResponse {
  openInNewWindow: boolean;
  targetUrl: string;
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
    return Response.json(
      { openInNewWindow: redirect.openInNewWindow },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return new Response(null, { status: 404 });
  }
};
