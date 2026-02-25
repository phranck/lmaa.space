/** Returns the hostname without "www.", falling back to the raw URL. */
export function shopDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

/** Appends ref=lmaa.space to the shop URL, falling back to the raw URL. */
export function shopRefUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("ref", "lmaa.space");
    return u.toString();
  } catch {
    return url;
  }
}
