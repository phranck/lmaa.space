import type { APIRoute } from "astro";

import { decodeShopToken, type Shop } from "@lmaa/shared";

import { apiGet } from "@/lib/api";

/**
 * Redirects an explicitly namespaced shop token to its canonical readable URL.
 *
 * Invalid or nonpublic identifiers resolve to the site's not-found page. Query
 * parameters are retained so navigation context survives the permanent
 * redirect.
 */
export const GET: APIRoute = async ({ params, redirect, url }) => {
  const token = params.token;
  if (!token || decodeShopToken(token) === null) return redirect("/404");

  try {
    const shop = await apiGet<Shop>(`/shops/id/${token}`);
    return redirect(`/shop/${shop.slug}${url.search}`, 308);
  } catch {
    return redirect("/404");
  }
};
