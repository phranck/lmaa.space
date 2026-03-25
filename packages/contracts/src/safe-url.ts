const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

type SafeUrlOptions = {
  allowRelative?: boolean;
  allowHash?: boolean;
  allowMailto?: boolean;
  allowTel?: boolean;
};

/**
 * Returns `true` if `value` is a URL safe for use in admin-configured links.
 *
 * Allows `https:` unconditionally and `http:` only for loopback addresses.
 * `mailto:`, `tel:`, relative paths and hash-only values are opt-in via `options`.
 *
 * @param value - The URL string to validate.
 * @param options - Optional flags to widen accepted URL schemes.
 * @returns `true` when the URL is considered safe, `false` otherwise.
 */
export function isSafeConfiguredUrl(value: string, options: SafeUrlOptions = {}): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (options.allowRelative && /^\/(?!\/)/.test(trimmed)) {
    return true;
  }

  if (options.allowHash && trimmed.startsWith("#")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    switch (parsed.protocol) {
      case "https:":
        return true;
      case "http:":
        return isLoopbackHost(parsed.hostname);
      case "mailto:":
        return options.allowMailto ?? false;
      case "tel:":
        return options.allowTel ?? false;
      default:
        return false;
    }
  } catch {
    return false;
  }
}
