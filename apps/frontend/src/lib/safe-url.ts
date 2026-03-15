const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SITE_HOSTS = new Set(["lmaa.space", "www.lmaa.space"]);
const TRUSTED_ASSET_HOSTS = new Set(["storage-prg1.zerops.io"]);

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

function hasExplicitScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

export function getSafeConfigHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (/^\/(?!\/)/.test(value) || value.startsWith("#")) {
    return value;
  }

  try {
    const parsed = new URL(value);
    switch (parsed.protocol) {
      case "https:":
        return parsed.toString();
      case "http:":
        return isLoopbackHost(parsed.hostname) ? parsed.toString() : null;
      case "mailto:":
        return value;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function getSafeActionUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const parsed = hasExplicitScheme(value) ? new URL(value) : new URL(`https://${value}`);
    switch (parsed.protocol) {
      case "https:":
      case "mailto:":
      case "tel:":
        return parsed.toString();
      case "http:":
        return isLoopbackHost(parsed.hostname) ? parsed.toString() : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function isExternalHref(href: string): boolean {
  if (!hasExplicitScheme(href)) return false;

  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }

    return !SITE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getSafeSiteAssetPath(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (/^\/(?!\/)/.test(value)) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if ((parsed.protocol === "https:" || parsed.protocol === "http:") && SITE_HOSTS.has(hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    if (parsed.protocol === "https:" && TRUSTED_ASSET_HOSTS.has(hostname)) {
      return parsed.toString();
    }

    if (parsed.protocol === "http:" && isLoopbackHost(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}
