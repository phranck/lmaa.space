import type { SupportPromptLimits, SupportPromptThresholdBasis } from "@lmaa/contracts";

/**
 * What the site remembers about the asks it has shown one reader.
 *
 * The rules live here rather than in the dashboard, because they are behaviour
 * derived from measured data: over 75 per cent of people who give do so on the
 * first or second showing, and from the tenth on practically nobody does. A
 * ceiling set by hand would be invisible until the giving stopped.
 *
 * Everything in this module is pure. It reads a store, takes a decision, and
 * returns the next store, so the rules can be tested without a browser.
 */

/** Where the store lives, in the naming of the other stores on this site. */
export const SUPPORT_PROMPT_STORAGE_KEY = "lmaa-support-prompt:v1";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a single dismissal pushes the next showing away, in days. */
/** What the site remembers about one prompt. */
export interface SupportPromptRecord {
  /** How often this prompt has been shown. */
  shown: number;
  /** How often the reader has closed it. */
  dismissed: number;
  /** Set once this prompt is done with, for whatever reason. */
  resolved: boolean;
}

/** What the site remembers about one reader. */
export interface SupportPromptStore {
  /** How often anything has been shown, across every prompt together. */
  shown: number;
  /** Nothing is shown before this moment, as milliseconds since the epoch. */
  snoozedUntil: number;
  /**
   * When that quiet period began, as milliseconds since the epoch.
   *
   * Kept so the period can be measured against the setting in force when it is
   * read rather than the one in force when it was written. Somebody who
   * shortens the setting expects that to hold for a quiet period already
   * running, not only for the next one. Zero where nothing is running, and for
   * a store written before this was recorded.
   */
  snoozedSince: number;
  /** The last shop page counted, so a reload does not count twice. */
  lastShopSlug: string | null;
  /** How many distinct shop pages the reader has looked at. */
  shopViews: number;
  /** One record per prompt, keyed by its identifier. */
  prompts: Record<string, SupportPromptRecord>;
}

/** The store of somebody the site has never asked. */
export function emptyStore(): SupportPromptStore {
  return { shown: 0, snoozedUntil: 0, snoozedSince: 0, lastShopSlug: null, shopViews: 0, prompts: {} };
}

function emptyRecord(): SupportPromptRecord {
  return { shown: 0, dismissed: 0, resolved: false };
}

/**
 * Reads a store back from what was stored, dropping anything unusable.
 *
 * Records for prompts that no longer exist are dropped, so a deleted prompt
 * leaves nothing behind in anybody's browser.
 *
 * @param raw - What the storage held, or `null` when it held nothing.
 * @param knownIds - The prompts that still exist.
 * @returns A store that is safe to use, whatever was in the storage.
 */
export function parseStore(raw: string | null, knownIds: readonly string[]): SupportPromptStore {
  const store = emptyStore();
  if (!raw) return store;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return store;
  }

  if (typeof parsed !== "object" || parsed === null) return store;
  const candidate = parsed as Partial<SupportPromptStore>;

  store.shown = Number.isFinite(candidate.shown) ? Number(candidate.shown) : 0;
  store.snoozedUntil = Number.isFinite(candidate.snoozedUntil) ? Number(candidate.snoozedUntil) : 0;
  store.snoozedSince = Number.isFinite(candidate.snoozedSince) ? Number(candidate.snoozedSince) : 0;
  store.shopViews = Number.isFinite(candidate.shopViews) ? Number(candidate.shopViews) : 0;
  store.lastShopSlug = typeof candidate.lastShopSlug === "string" ? candidate.lastShopSlug : null;

  const known = new Set(knownIds);
  const records = candidate.prompts;
  if (records && typeof records === "object") {
    for (const [id, record] of Object.entries(records)) {
      if (!known.has(id) || typeof record !== "object" || record === null) continue;
      const entry = record as Partial<SupportPromptRecord>;
      store.prompts[id] = {
        shown: Number.isFinite(entry.shown) ? Number(entry.shown) : 0,
        dismissed: Number.isFinite(entry.dismissed) ? Number(entry.dismissed) : 0,
        resolved: entry.resolved === true,
      };
    }
  }

  return store;
}

/** What a prompt needs to carry for the store to judge it. */
export interface PromptCandidate {
  id: string;
  threshold: number;
  /** Which counter the threshold is measured against. */
  thresholdBasis: SupportPromptThresholdBasis;
  priority: number;
}

/** How far the reader has come, by each counter a threshold may read. */
export type ReaderProgress = Record<SupportPromptThresholdBasis, number>;

/**
 * Picks the one prompt to show, or nothing.
 *
 * Checked in this order: the reader's own ceiling, the quiet period, then each
 * prompt's own state and its threshold. Among what is left the highest priority
 * wins, and the order the server sent decides a tie, because it already sorted
 * by age.
 *
 * @param candidates - The prompts for this slot, as the server sent them.
 * @param store - What the site remembers about this reader.
 * @param limits - What bounds the reader across every prompt together.
 * @param progress - How far the reader has come, by each counter.
 * @param now - The current moment, as milliseconds since the epoch.
 * @returns The prompt to show, or `null` when the reader has had enough.
 */
/**
 * When the current quiet period ends, measured against the setting in force.
 *
 * A period that was started under a longer setting is cut back to what the
 * setting allows now, counted from when it began. Where a store predates the
 * recording of that moment, the stored end stands, because there is nothing to
 * measure against.
 *
 * @param store - What is remembered about this reader.
 * @param limits - The settings in force right now.
 * @returns The moment before which nothing is shown.
 */
function quietUntil(store: SupportPromptStore, limits: SupportPromptLimits): number {
  if (!store.snoozedSince) return store.snoozedUntil;
  return Math.min(store.snoozedUntil, store.snoozedSince + limits.snoozeDays * DAY_MS);
}

export function choosePrompt(
  candidates: readonly PromptCandidate[],
  store: SupportPromptStore,
  limits: SupportPromptLimits,
  progress: ReaderProgress,
  now: number,
  alwaysShow = false,
): PromptCandidate | null {
  // Whilst the limits are set aside, only the threshold still applies: that one
  // says which prompt belongs on this page, whereas the rest say how often one
  // reader may be asked. Whether they may be set aside at all is the backend's
  // answer, which is never yes in production.
  if (!alwaysShow) {
    if (store.shown >= limits.maxShown) return null;
    if (now < quietUntil(store, limits)) return null;
  }

  let best: PromptCandidate | null = null;
  for (const candidate of candidates) {
    // A basis that is missing or unknown falls back to the default counter
    // rather than to no counter. Reading an absent one would compare against
    // `undefined`, which is never less than the threshold, and the prompt would
    // slip past the very check it is measured by.
    const reached = progress[candidate.thresholdBasis] ?? progress.viewed;
    if (reached < candidate.threshold) continue;
    if (!alwaysShow && store.prompts[candidate.id]?.resolved) continue;
    if (!best || candidate.priority > best.priority) best = candidate;
  }

  return best;
}

/**
 * Records that a prompt was shown, and puts the site to sleep for a while.
 *
 * @param store - The store before the showing.
 * @param id - The prompt that was shown.
 * @param limits - Where the quiet period comes from.
 * @param now - The current moment, as milliseconds since the epoch.
 * @returns The store afterwards.
 */
export function recordShown(
  store: SupportPromptStore,
  id: string,
  limits: SupportPromptLimits,
  now: number,
): SupportPromptStore {
  const record = store.prompts[id] ?? emptyRecord();
  return {
    ...store,
    shown: store.shown + 1,
    snoozedUntil: now + limits.snoozeDays * DAY_MS,
    snoozedSince: now,
    prompts: { ...store.prompts, [id]: { ...record, shown: record.shown + 1 } },
  };
}

/**
 * Records that the reader followed the prompt or said they had already given.
 *
 * Either way this prompt has done its work and never comes back.
 */
export function recordResolved(store: SupportPromptStore, id: string): SupportPromptStore {
  const record = store.prompts[id] ?? emptyRecord();
  return { ...store, prompts: { ...store.prompts, [id]: { ...record, resolved: true } } };
}

/**
 * Records that the reader closed the prompt.
 *
 * Closing once says "not now" and pushes the next showing three months away.
 * Closing the same prompt three times says "no", and it stops coming back.
 *
 * @param now - The current moment, as milliseconds since the epoch.
 */
export function recordDismissed(
  store: SupportPromptStore,
  id: string,
  limits: SupportPromptLimits,
  now: number,
): SupportPromptStore {
  const record = store.prompts[id] ?? emptyRecord();
  const dismissed = record.dismissed + 1;
  return {
    ...store,
    snoozedUntil: Math.max(store.snoozedUntil, now + limits.dismissSnoozeDays * DAY_MS),
    snoozedSince: now,
    prompts: {
      ...store.prompts,
      [id]: { ...record, dismissed, resolved: dismissed >= limits.dismissalsUntilResolved },
    },
  };
}

/**
 * Counts a shop page, but only when it is a different shop.
 *
 * Reloading a page is not a second visit, and the difference decides whether
 * the fifth shop is really the fifth.
 *
 * @param slug - The shop being looked at.
 * @returns The store afterwards, unchanged when the slug is the last one.
 */
export function countShopView(store: SupportPromptStore, slug: string): SupportPromptStore {
  if (store.lastShopSlug === slug) return store;
  return { ...store, lastShopSlug: slug, shopViews: store.shopViews + 1 };
}
