import { PENDING_SPONSORSHIP_DAYS } from "@lmaa/contracts";

/**
 * The reference a reader was given, kept until they have paid or it lapses.
 *
 * Somebody who fills the form in leaves for their banking app and comes back to
 * a fresh page, so the reference has to survive that. It is theirs alone and
 * never leaves their browser.
 *
 * Everything here is pure: it reads what was stored, decides, and returns a
 * value, so the rules can be tested without a browser.
 */

/** Where the reference lives, in the naming of the other stores on this site. */
export const PENDING_SPONSORSHIP_STORAGE_KEY = "lmaa-sponsorship:v1";

/** A day in milliseconds, which is what the lifetime is counted in. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** What somebody said about themselves, as the form takes it. */
export interface AnnouncedSponsorship {
  firstName: string;
  lastName: string;
  link: string;
  claim: string;
  published: boolean;
}

/** What the site remembers after somebody has announced a sponsorship. */
export interface IssuedSponsorship {
  /** The reference as it travels, which is what the payment carries. */
  reference: string;
  /** The same reference in groups of four, which is how it is shown. */
  referenceFormatted: string;
  /** When it was issued, as milliseconds since the epoch. */
  issuedAt: number;
  /**
   * What was announced, so correcting it starts from what was said.
   *
   * Kept here rather than asked back from the server, because a route that
   * answers what stands behind a reference would be a way to read somebody's
   * entry with nothing but their reference.
   */
  announced: AnnouncedSponsorship;
}

/** An announcement with nothing in it, for an entry stored before this was kept. */
const NOTHING_ANNOUNCED: AnnouncedSponsorship = {
  firstName: "",
  lastName: "",
  link: "",
  claim: "",
  published: true,
};

/**
 * Reads back what was announced, taking only what is of the right shape.
 *
 * @param value - Whatever the storage held under `announced`.
 */
function parseAnnounced(value: unknown): AnnouncedSponsorship {
  if (typeof value !== "object" || value === null) return NOTHING_ANNOUNCED;
  const candidate = value as Partial<AnnouncedSponsorship>;

  return {
    firstName: typeof candidate.firstName === "string" ? candidate.firstName : "",
    lastName: typeof candidate.lastName === "string" ? candidate.lastName : "",
    link: typeof candidate.link === "string" ? candidate.link : "",
    claim: typeof candidate.claim === "string" ? candidate.claim : "",
    published: candidate.published !== false,
  };
}

/**
 * Reads back what was stored, or nothing.
 *
 * An entry older than the server keeps one is dropped, because the row it
 * points at is gone by then. Showing a reference for a record that no longer
 * exists is worse than showing none, since the payment would arrive with
 * nothing to attach it to.
 *
 * @param raw - What the storage held, or `null` when it held nothing.
 * @param now - The current moment, as milliseconds since the epoch.
 * @returns The reference, or `null` when there is none worth showing.
 */
export function parseIssuedSponsorship(raw: string | null, now: number): IssuedSponsorship | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Partial<IssuedSponsorship>;

  if (typeof candidate.reference !== "string" || candidate.reference === "") return null;
  if (typeof candidate.referenceFormatted !== "string" || candidate.referenceFormatted === "") {
    return null;
  }
  if (!Number.isFinite(candidate.issuedAt)) return null;

  const issuedAt = Number(candidate.issuedAt);
  if (now - issuedAt >= PENDING_SPONSORSHIP_DAYS * DAY_MS) return null;

  return {
    reference: candidate.reference,
    referenceFormatted: candidate.referenceFormatted,
    issuedAt,
    announced: parseAnnounced(candidate.announced),
  };
}

/**
 * The value last read or written, so every reader is given the same object.
 *
 * `useSyncExternalStore` compares snapshots by identity and re-renders whenever
 * one differs, so parsing afresh on every call would never settle.
 */
let snapshot: IssuedSponsorship | null = null;

/** Whoever wants to hear that the reference has changed. */
const listeners = new Set<() => void>();

function readStorage(): IssuedSponsorship | null {
  try {
    return parseIssuedSponsorship(
      window.localStorage.getItem(PENDING_SPONSORSHIP_STORAGE_KEY),
      Date.now(),
    );
  } catch {
    // A browser that refuses storage still shows the form. It just cannot show
    // the reference again after a reload.
    return null;
  }
}

function announce(next: IssuedSponsorship | null): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

/**
 * Watches the reference, including when another tab of this site changes it.
 *
 * @param onChange - Called whenever the stored reference is not what it was.
 * @returns The function that stops watching.
 */
export function subscribeIssuedSponsorship(onChange: () => void): () => void {
  if (listeners.size === 0) snapshot = readStorage();
  listeners.add(onChange);

  function onStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== PENDING_SPONSORSHIP_STORAGE_KEY) return;
    announce(readStorage());
  }

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The reference as it stands, for a browser. */
export function getIssuedSponsorship(): IssuedSponsorship | null {
  return snapshot;
}

/**
 * The reference as it stands on the server, which is none.
 *
 * The page is rendered before any browser is involved, so nothing personal is
 * ever part of what the server sends.
 */
export function getServerIssuedSponsorship(): null {
  return null;
}

/**
 * Remembers a reference the site has just issued.
 *
 * @param issued - The reference and the moment it was given.
 */
export function rememberIssuedSponsorship(issued: IssuedSponsorship): void {
  announce(issued);
  try {
    window.localStorage.setItem(PENDING_SPONSORSHIP_STORAGE_KEY, JSON.stringify(issued));
  } catch {
    // It is on screen either way, which is what the reader needs right now.
  }
}
