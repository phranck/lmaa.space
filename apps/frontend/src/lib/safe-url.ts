const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SITE_HOSTS = new Set(["lmaa.space", "www.lmaa.space"]);
const TRUSTED_ASSET_HOSTS = new Set(["storage-prg1.zerops.io"]);

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

function hasExplicitScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Returns a safe href for use in admin-configured links rendered on the frontend.
 *
 * Allows `https:`, `mailto:`, root-relative paths and hash links.
 * `http:` is only allowed for loopback hosts (local dev).
 *
 * @param raw - Raw configured URL string.
 * @returns Sanitized URL string, or `null` if the value is empty or unsafe.
 */
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

/**
 * Returns a safe URL for form `action` attributes and interactive links.
 *
 * More permissive than `getSafeConfigHref`: also accepts `tel:`, root-relative paths
 * and bare hostnames (prefixed with `https://`). Only `http:` to loopback is allowed.
 *
 * @param raw - Raw URL or bare hostname string.
 * @returns Sanitized URL, or `null` if empty or unsafe.
 */
export function getSafeActionUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (value.startsWith("/")) {
    return /^\/(?![\\/])/.test(value) ? value : null;
  }

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

/**
 * Returns `true` if the href points to a different origin than the site itself.
 *
 * Used to conditionally add `target="_blank" rel="noopener noreferrer"`.
 *
 * @param href - The href string to check.
 * @returns `true` for external URLs, `false` for same-site and non-http(s) links.
 */
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

/**
 * Returns a safe path or URL for site assets (images, static files).
 *
 * Accepts root-relative paths, same-site URLs (path only), and URLs from
 * trusted external asset hosts. Returns `null` for unsafe values.
 *
 * @param raw - Raw asset path or URL string.
 * @returns Safe path/URL, or `null` if empty or from an untrusted host.
 */
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

/**
 * Escapes a string for safe embedding inside an HTML attribute value.
 *
 * @param value - Raw string value.
 * @returns HTML-entity-escaped string.
 */
export function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}
