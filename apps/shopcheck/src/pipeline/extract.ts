import { parse as tldtsParse } from "tldts";

import type { FetchedPage } from "./research";

export type Evidence = {
  field: string;
  value: string;
  url: string;
  snippet: string;
  confidence: number;
};

export type ExtractedFacts = {
  legalEntity: string | null;
  legalEntityType: string | null;
  owners: string[];
  address: {
    street: string | null;
    postalCode: string | null;
    city: string | null;
    state: string | null;
    countryCode: string | null;
    sourceUrl: string | null;
  };
  contact: {
    emails: string[];
    phones: string[];
  };
  shippingRegions: Array<"DE" | "AT" | "CH" | "EU" | "WORLD">;
  languageGermanLikely: boolean;
  exclusionSignals: string[];
  socialMedia: {
    mastodon: string | null;
    bluesky: string | null;
    twitter: string | null;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    twitch: string | null;
    pinterest: string | null;
    linkedin: string | null;
    facebook: string | null;
    threads: string | null;
    patreon: string | null;
  };
  affiliateInfoUrl: string | null;
  notes: {
    focus: string[];
    brandsOrProducts: string[];
    companyPresentation: string | null;
  };
  evidence: Evidence[];
};

function snippetAround(text: string, index: number, radius = 120): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function pushEvidence(list: Evidence[], entry: Evidence): void {
  const key = `${entry.field}|${entry.value}|${entry.url}`;
  if (!list.some((item) => `${item.field}|${item.value}|${item.url}` === key)) {
    list.push(entry);
  }
}

/**
 * Normalize shipping regions to selector-compatible canonical form:
 * - WORLD evidenced → ["WORLD"] only
 * - EU evidenced (no WORLD) → ["EU"] only
 * - Otherwise only concrete DACH codes among DE, AT, CH
 */
export function normalizeShipping(regions: Iterable<"DE" | "AT" | "CH" | "EU" | "WORLD">): Array<"DE" | "AT" | "CH" | "EU" | "WORLD"> {
  const set = new Set(regions);
  if (set.has("WORLD")) return ["WORLD"];
  if (set.has("EU")) return ["EU"];
  const order: Array<"DE" | "AT" | "CH"> = ["DE", "AT", "CH"];
  return order.filter((r) => set.has(r));
}

function detectEntityType(legalEntity: string | null): string | null {
  if (!legalEntity) return null;
  const m = legalEntity.match(/\b(GmbH|UG|AG|GbR|OHG|KG|e\.?K\.?|LLC|Ltd\.?)\b/i);
  return m ? m[1].replace(/\s+/g, "") : null;
}

function cleanSocialUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    const removeParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "si", "trk"];
    for (const key of removeParams) u.searchParams.delete(key);
    return u.toString().replace(/\/+$/, "");
  } catch {
    return raw;
  }
}

const PRIMARY_EMAIL_PREFIXES = [
  "info", "kontakt", "contact", "hello", "hey", "hallo", "mail", "shop", "service", "support", "bestellung", "order",
];

function emailRank(email: string): number {
  const local = email.split("@")[0];
  const idx = PRIMARY_EMAIL_PREFIXES.indexOf(local);
  return idx >= 0 ? idx : PRIMARY_EMAIL_PREFIXES.length;
}

function rankEmails(emails: string[]): string[] {
  return [...emails].sort((a, b) => emailRank(a) - emailRank(b));
}

/** Validate email domain via tldts; extract valid email if garbage is appended after TLD. */
function cleanEmailDomain(raw: string): string | null {
  const atIdx = raw.lastIndexOf("@");
  if (atIdx < 1) return null;

  const local = raw.slice(0, atIdx);
  const domainPart = raw.slice(atIdx + 1);

  const full = tldtsParse(domainPart);
  if (full.domain && full.publicSuffix) {
    return `${local}@${domainPart}`;
  }

  // Garbage appended after TLD (e.g. "beeproud.dekontaktformular")
  // Try trimming from right to find valid domain
  const lastDot = domainPart.lastIndexOf(".");
  if (lastDot < 1) return null;

  const beforeTld = domainPart.slice(0, lastDot);
  const afterDot = domainPart.slice(lastDot + 1);

  for (let len = afterDot.length - 1; len >= 2; len--) {
    const candidate = `${beforeTld}.${afterDot.slice(0, len)}`;
    const r = tldtsParse(candidate);
    if (r.domain && r.publicSuffix) {
      return `${local}@${candidate}`;
    }
  }

  return null;
}

function extractSocialMedia(html: string): ExtractedFacts["socialMedia"] {
  const out: ExtractedFacts["socialMedia"] = {
    mastodon: null,
    bluesky: null,
    twitter: null,
    instagram: null,
    tiktok: null,
    youtube: null,
    twitch: null,
    pinterest: null,
    linkedin: null,
    facebook: null,
    threads: null,
    patreon: null,
  };
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  let m = hrefRe.exec(html);
  while (m) {
    const href = m[1];
    if (!/^https?:\/\//i.test(href)) {
      m = hrefRe.exec(html);
      continue;
    }
    const u = href.toLowerCase();
    if (!out.instagram && u.includes("instagram.com/")) out.instagram = cleanSocialUrl(href);
    if (!out.tiktok && u.includes("tiktok.com/")) out.tiktok = cleanSocialUrl(href);
    if (!out.facebook && u.includes("facebook.com/")) out.facebook = cleanSocialUrl(href);
    if (!out.youtube && (u.includes("youtube.com/") || u.includes("youtu.be/"))) out.youtube = cleanSocialUrl(href);
    if (!out.twitter && (u.includes("twitter.com/") || u.includes("x.com/"))) out.twitter = cleanSocialUrl(href);
    if (!out.linkedin && u.includes("linkedin.com/")) out.linkedin = cleanSocialUrl(href);
    if (!out.pinterest && u.includes("pinterest.")) out.pinterest = cleanSocialUrl(href);
    if (!out.threads && u.includes("threads.net/")) out.threads = cleanSocialUrl(href);
    if (!out.twitch && u.includes("twitch.tv/")) out.twitch = cleanSocialUrl(href);
    if (!out.patreon && u.includes("patreon.com/")) out.patreon = cleanSocialUrl(href);
    if (!out.bluesky && u.includes("bsky.app/")) out.bluesky = cleanSocialUrl(href);
    if (!out.mastodon && /https?:\/\/[^/]+\/@[^/\s]+/i.test(href) && !/tiktok\.com|instagram\.com|twitter\.com|x\.com|threads\.net|facebook\.com|youtube\.com|linkedin\.com|pinterest\.|twitch\.tv|patreon\.com|bsky\.app/i.test(href)) out.mastodon = cleanSocialUrl(href);
    m = hrefRe.exec(html);
  }
  return out;
}

/**
 * Deterministic fact extraction from crawled pages.
 * Handles: emails, phones, shipping regions, language detection, exclusion signals,
 * legal entity, social media, focus hints, brands/products.
 * Address + owners extraction is delegated to the LLM (too error-prone with regex).
 */
export function extractFacts(pages: FetchedPage[]): ExtractedFacts {
  const evidence: Evidence[] = [];
  const emails = new Set<string>();
  const phones = new Set<string>();
  const shipping = new Set<"DE" | "AT" | "CH" | "EU" | "WORLD">();
  const exclusionSignals = new Set<string>();
  let legalEntity: string | null = null;
  let legalEntityType: string | null = null;
  let germanScore = 0;
  let affiliateInfoUrl: string | null = null;
  const social: ExtractedFacts["socialMedia"] = {
    mastodon: null,
    bluesky: null,
    twitter: null,
    instagram: null,
    tiktok: null,
    youtube: null,
    twitch: null,
    pinterest: null,
    linkedin: null,
    facebook: null,
    threads: null,
    patreon: null,
  };

  for (const page of pages) {
    const text = page.text;
    const lower = text.toLowerCase();
    const pageSocial = extractSocialMedia(page.html);
    for (const key of Object.keys(social) as Array<keyof typeof social>) {
      social[key] = social[key] ?? pageSocial[key];
    }

    // Emails
    const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    let em = emailRe.exec(text);
    while (em) {
      // Strip leading digits that are likely a phone number glued to the email
      const stripped = em[0].replace(/^\d{5,}/, "");
      if (!stripped.includes("@")) { em = emailRe.exec(text); continue; }
      // Validate domain via tldts; extract valid email if garbage appended after TLD
      const validEmail = cleanEmailDomain(stripped.toLowerCase());
      if (!validEmail) { em = emailRe.exec(text); continue; }
      emails.add(validEmail);
      pushEvidence(evidence, {
        field: "contact.email",
        value: validEmail,
        url: page.url,
        snippet: snippetAround(text, em.index),
        confidence: 0.95,
      });
      em = emailRe.exec(text);
    }

    // Phones
    const phoneRe = /\+?\d[\d\s()/-]{6,}\d/g;
    let ph = phoneRe.exec(text);
    while (ph) {
      const val = ph[0].trim();
      if (val.length >= 8) {
        phones.add(val);
        pushEvidence(evidence, {
          field: "contact.phone",
          value: val,
          url: page.url,
          snippet: snippetAround(text, ph.index),
          confidence: 0.7,
        });
      }
      ph = phoneRe.exec(text);
    }

    // Shipping regions
    if (/\bversand weltweit\b|\bworldwide shipping\b|\bships worldwide\b/.test(lower)) {
      shipping.add("WORLD");
      pushEvidence(evidence, { field: "shippingRegions", value: "WORLD", url: page.url, snippet: "Versand weltweit", confidence: 0.9 });
    }
    if (/\beuropaweit\b|\beu[- ]weit\b|\bships to eu\b|\beurope-wide\b/.test(lower)) {
      shipping.add("EU");
      pushEvidence(evidence, { field: "shippingRegions", value: "EU", url: page.url, snippet: "EU/europaweit", confidence: 0.85 });
    }
    if (/\bdeutschland\b|\bgermany\b|\bversand nach de\b/.test(lower)) shipping.add("DE");
    if (/\bösterreich\b|\baustria\b|\bversand nach at\b/.test(lower)) shipping.add("AT");
    if (/\bschweiz\b|\bswitzerland\b|\bversand nach ch\b/.test(lower)) shipping.add("CH");

    // German language detection
    if (/\bimpressum\b|\bdatenschutz\b|\bwiderruf\b|\bversand\b|\bkontakt\b/.test(lower)) germanScore += 1;

    // Exclusion signals
    if (/\bmarketplace\b|\bmarktplatz\b/.test(lower) && /\bverkäufer\b|\bseller\b|\bmehrere händler\b/.test(lower)) exclusionSignals.add("marketplace");
    if (/\bdropshipping\b/.test(lower)) exclusionSignals.add("dropshipping");
    if (/\baffiliate\b|\bpartnerlinks?\b/.test(lower)) exclusionSignals.add("affiliate");
    if ((/\bfilialen?\b|\bstandorte\b/.test(lower) && /\b\d+\b/.test(lower)) || /\bdepartment store\b/.test(lower)) exclusionSignals.add("chain_or_department_store");

    // Legal entity (regex works well for structured patterns like "Foo GmbH")
    if (!legalEntity) {
      const legalRe = /\b([A-ZÄÖÜ0-9][A-Za-zÄÖÜäöüß0-9&.,\- ]{2,80}\s(?:GmbH|UG|e\.?K\.?|AG|GbR|OHG|KG|Ltd\.?|LLC|S\.?A\.?R\.?L\.?))\b/u;
      const lm = legalRe.exec(text);
      if (lm) {
        legalEntity = lm[1].trim();
        legalEntityType = detectEntityType(legalEntity);
        pushEvidence(evidence, {
          field: "legal.entity",
          value: legalEntity,
          url: page.url,
          snippet: snippetAround(text, lm.index),
          confidence: 0.88,
        });
      }
    }

    // Affiliate program link detection
    if (!affiliateInfoUrl) {
      const affiliateHrefRe = /href\s*=\s*["']([^"']+)["']/gi;
      let ah = affiliateHrefRe.exec(page.html);
      while (ah) {
        const href = ah[1].toLowerCase();
        if (/affiliate|partnerprogramm|partner-programm|become-a-partner|referral-program/.test(href)) {
          try {
            affiliateInfoUrl = new URL(ah[1], page.url).toString();
          } catch {
            affiliateInfoUrl = ah[1];
          }
          break;
        }
        ah = affiliateHrefRe.exec(page.html);
      }
    }

  }

  return {
    legalEntity,
    legalEntityType,
    owners: [],
    address: {
      street: null,
      postalCode: null,
      city: null,
      state: null,
      countryCode: null,
      sourceUrl: null,
    },
    contact: {
      emails: rankEmails([...emails]),
      phones: [...phones],
    },
    shippingRegions: normalizeShipping(shipping),
    languageGermanLikely: germanScore > 0,
    exclusionSignals: [...exclusionSignals],
    socialMedia: social,
    affiliateInfoUrl,
    notes: {
      focus: [],
      brandsOrProducts: [],
      companyPresentation: null,
    },
    evidence,
  };
}
