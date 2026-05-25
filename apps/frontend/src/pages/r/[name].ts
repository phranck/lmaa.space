import type { APIRoute } from "astro";

import { apiGet } from "@/lib/api";

interface RedirectUrlResponse {
  targetUrl: string;
}

export const GET: APIRoute = async ({ params }) => {
  const name = params.name;
  if (!name) {
    return new Response(null, { status: 404 });
  }

  try {
    const redirect = await apiGet<RedirectUrlResponse>(
      `/redirect-urls/${encodeURIComponent(name)}`,
    );
    return Response.redirect(redirect.targetUrl, 302);
  } catch {
    return new Response(null, { status: 404 });
  }
};
