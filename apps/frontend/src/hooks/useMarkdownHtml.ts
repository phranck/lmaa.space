import { type RefObject, useEffect, useRef } from "react";

import { renderMarkdown } from "@/lib/markdown";

const SITE_REDIRECT_HOSTS = new Set(["lmaa.space", "www.lmaa.space"]);
const redirectNewWindowCache = new Map<string, Promise<boolean>>();

function getRedirectNameFromHref(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    const isCurrentOrigin = url.origin === window.location.origin;
    const isCanonicalSite = SITE_REDIRECT_HOSTS.has(url.hostname.toLowerCase());
    if (!isCurrentOrigin && !isCanonicalSite) return null;

    const match = /^\/r\/([^/]+)\/?$/.exec(url.pathname);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function getRedirectOpenInNewWindow(name: string): Promise<boolean> {
  const cached = redirectNewWindowCache.get(name);
  if (cached) return cached;

  const request = fetch(`/r/${encodeURIComponent(name)}/meta`, {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) return false;
      const data = (await response.json()) as { openInNewWindow?: unknown };
      return data.openInNewWindow === true;
    })
    .catch(() => false);

  redirectNewWindowCache.set(name, request);
  return request;
}

function replaceWithRenderedHtml(root: HTMLElement, html: string): void {
  const doc = new DOMParser().parseFromString(html, "text/html");
  root.replaceChildren(...Array.from(doc.body.childNodes));
}

async function applyRedirectLinkTargets(root: HTMLElement): Promise<void> {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"));
  await Promise.all(
    links.map(async (link) => {
      const name = getRedirectNameFromHref(link.getAttribute("href") ?? "");
      if (!name) return;

      const openInNewWindow = await getRedirectOpenInNewWindow(name);
      if (!openInNewWindow) return;

      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }),
  );
}

/**
 * Renders a Markdown string to HTML and injects it into a container element.
 *
 * Handles async rendering with a race-condition guard so only the latest
 * render result is applied. Returns a ref to attach to the target container.
 *
 * @param source - Markdown source string, or null/undefined to clear.
 * @returns Ref callback to attach to a `<div>` container.
 */
export function useMarkdownHtml(
  source: string | undefined | null,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const renderKeyRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!source) {
      el.replaceChildren();
      return;
    }
    const currentKey = ++renderKeyRef.current;
    void renderMarkdown(source).then((html) => {
      if (renderKeyRef.current !== currentKey || !ref.current) return;
      replaceWithRenderedHtml(ref.current, html);
      void applyRedirectLinkTargets(ref.current).then(() => {
        if (renderKeyRef.current !== currentKey || !ref.current) return;
      });
    });
  }, [source]);

  return ref;
}
