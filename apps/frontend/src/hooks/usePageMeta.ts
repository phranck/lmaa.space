import { useEffect } from "react";

const BASE_URL = "https://lmaa.space";
const SITE_NAME = "lmaa.space";
const DEFAULT_DESCRIPTION =
  "Entdecke faire, nachhaltige und unabhängige Online-Shops als Alternativen zu Amazon – kuratiert von der Community.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/logo.png`;

export interface PageMetaOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown>;
}

function setMeta(selector: string, content: string): void {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
}

function setLink(rel: string, href: string): void {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(schema: Record<string, unknown> | undefined): void {
  let el = document.querySelector<HTMLScriptElement>("script[data-page-schema]");
  if (schema) {
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.dataset.pageSchema = "";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
  } else {
    el?.remove();
  }
}

export function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = "/",
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd,
}: PageMetaOptions = {}) {
  const fullTitle = title ? `${title} – ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;
  const jsonLdString = jsonLd !== undefined ? JSON.stringify(jsonLd) : undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies: jsonLd serialized for stable comparison
  useEffect(() => {
    document.title = fullTitle;
    setMeta('meta[name="description"]', description);
    setLink("canonical", canonicalUrl);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[property="og:image"]', ogImage);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', ogImage);
    setJsonLd(jsonLdString !== undefined ? (JSON.parse(jsonLdString) as Record<string, unknown>) : undefined);

    return () => {
      document.title = SITE_NAME;
      setMeta('meta[name="description"]', DEFAULT_DESCRIPTION);
      setLink("canonical", `${BASE_URL}/`);
      setMeta('meta[property="og:title"]', SITE_NAME);
      setMeta('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[property="og:url"]', `${BASE_URL}/`);
      setMeta('meta[property="og:image"]', DEFAULT_OG_IMAGE);
      setMeta('meta[name="twitter:title"]', SITE_NAME);
      setMeta('meta[name="twitter:description"]', DEFAULT_DESCRIPTION);
      setMeta('meta[name="twitter:image"]', DEFAULT_OG_IMAGE);
      setJsonLd(undefined);
    };
  }, [fullTitle, description, canonicalUrl, ogImage, jsonLdString]);
}
