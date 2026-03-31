import { env } from "../config/env.js";
import type { HeroImage } from "../db/schema.js";
import {
  getHeroCacheImageUrl,
  isHeroCacheImageStored,
  putHeroCacheImage,
  removeHeroCacheImage,
} from "../lib/media-storage.js";
import { getSetting, putSetting } from "../repositories/app-settings.js";
import {
  clearHeroImageSelections,
  createHeroImage,
  deleteHeroImage,
  listHeroImages,
  listSelectedHeroImages,
  setHeroImageFocalPoint,
  setHeroImageSelected,
} from "../repositories/hero.js";

const s3CacheEnabled = () => !!(env.S3_ENDPOINT && env.S3_BUCKET);

async function downloadAndCacheHeroImage(id: number, url: string): Promise<void> {
  if (!s3CacheEnabled()) return;
  if (await isHeroCacheImageStored(id)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image for cache: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await putHeroCacheImage(id, buffer);
}

function triggerHeroImageCache(id: number, url: string): void {
  downloadAndCacheHeroImage(id, url).catch((err: unknown) => {
    console.error(`[hero-image-cache] Failed to cache image ${id}:`, err);
  });
}

export async function warmupHeroImageCache(): Promise<void> {
  if (!s3CacheEnabled()) return;
  const images = await listHeroImages();
  for (const image of images) {
    triggerHeroImageCache(image.id, image.url);
  }
}

export type { HeroImage };

// -----------------------------------------------------------------------
// Rotation enabled flag
// -----------------------------------------------------------------------

const ROTATION_ENABLED_KEY = "hero.rotationEnabled";

export async function getHeroRotationEnabled(): Promise<boolean> {
  const value = await getSetting(ROTATION_ENABLED_KEY);
  return value !== "false"; // defaults to true when not set
}

export async function setHeroRotationEnabled(enabled: boolean): Promise<void> {
  await putSetting(ROTATION_ENABLED_KEY, String(enabled));
}

// -----------------------------------------------------------------------
// Rotation interval (number of page loads before image changes)
// -----------------------------------------------------------------------

const INTERVAL_KEY = "hero.rotation.interval";

export async function getHeroRotationInterval(): Promise<number> {
  const value = await getSetting(INTERVAL_KEY);
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isNaN(parsed) || parsed < 1 ? 3 : parsed;
}

export async function setHeroRotationInterval(interval: number): Promise<void> {
  await putSetting(INTERVAL_KEY, String(interval));
}

// -----------------------------------------------------------------------
// Per-visitor state (passed via query param, stored as cookie by Astro)
// -----------------------------------------------------------------------

export interface VisitorState {
  /** Total page-load count for this visitor. */
  v: number;
  /** Currently displayed image id (0 = none). */
  c: number;
  /** visitCount value when the current image was first shown. */
  s: number;
  /** Up to 3 previously shown image ids (used to enforce the no-repeat rule). */
  r: number[];
}

function parseVisitorState(raw: string | null | undefined): VisitorState {
  if (!raw) return { v: 0, c: 0, s: 0, r: [] };
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return {
      v: typeof parsed.v === "number" ? parsed.v : 0,
      c: typeof parsed.c === "number" ? parsed.c : 0,
      s: typeof parsed.s === "number" ? parsed.s : 0,
      r: Array.isArray(parsed.r) ? (parsed.r as number[]).filter((x) => typeof x === "number") : [],
    };
  } catch {
    return { v: 0, c: 0, s: 0, r: [] };
  }
}

/**
 * Determines the hero image for this visitor page-load.
 *
 * - Increments `visitCount` each call.
 * - Keeps the same image for `interval` consecutive loads.
 * - When switching, excludes the current image and the last 3 images shown
 *   (enforcing the "at least 4 loads before repeat" rule).
 * - Falls back gracefully when the pool is too small to honour all exclusions.
 */
function pickHeroImage(
  images: HeroImage[],
  state: VisitorState,
  interval: number,
): { image: HeroImage; nextState: VisitorState } | null {
  if (images.length === 0) return null;

  const newVisitCount = state.v + 1;

  // Keep showing the current image if the interval hasn't elapsed
  const current = images.find((img) => img.id === state.c);
  if (current && newVisitCount - state.s < interval) {
    return { image: current, nextState: { ...state, v: newVisitCount } };
  }

  // Time for a new image — build exclusion set (current + last 3 shown)
  const excludeIds = new Set<number>(state.c ? [state.c, ...state.r] : state.r);

  let candidates = images.filter((img) => !excludeIds.has(img.id));

  // Relax exclusions progressively if pool is too small
  if (candidates.length === 0) {
    candidates = images.filter((img) => img.id !== state.c);
  }
  if (candidates.length === 0) {
    candidates = images;
  }

  const newImage = candidates[Math.floor(Math.random() * candidates.length)];

  // Prepend old current to recentIds, keep last 3
  const newRecentIds = (state.c ? [state.c, ...state.r] : state.r).slice(0, 3);

  return {
    image: newImage,
    nextState: {
      v: newVisitCount,
      c: newImage.id,
      s: newVisitCount,
      r: newRecentIds,
    },
  };
}

// -----------------------------------------------------------------------
// Public API (called from routes)
// -----------------------------------------------------------------------

export async function getAdminHeroImages(): Promise<HeroImage[]> {
  return listHeroImages();
}

export async function addHeroImage(data: {
  url: string;
  photographer: string;
  photographerUrl: string;
  downloadLocation: string;
}): Promise<HeroImage> {
  const image = await createHeroImage(data);
  triggerHeroImageCache(image.id, image.url);
  return image;
}

export async function removeHeroImage(id: number): Promise<void> {
  await deleteHeroImage(id);
  if (s3CacheEnabled()) {
    removeHeroCacheImage(id).catch((err: unknown) => {
      console.error(`[hero-image-cache] Failed to remove cached image ${id}:`, err);
    });
  }
}

export async function updateHeroImageFocalPoint(id: number, focalPointY: number): Promise<HeroImage> {
  return setHeroImageFocalPoint(id, Math.max(0, Math.min(100, Math.round(focalPointY))));
}

export async function toggleHeroImageSelected(
  id: number,
  selected: boolean,
): Promise<HeroImage> {
  if (selected) {
    const rotationEnabled = await getHeroRotationEnabled();
    if (!rotationEnabled) {
      await clearHeroImageSelections();
    }
  }
  return setHeroImageSelected(id, selected);
}

/**
 * Returns the hero image for a visitor page-load together with the new
 * visitor state to be stored as a cookie by the caller (Astro SSR page).
 *
 * @param rawState - URL-encoded JSON visitor state from the `state` query param.
 */
export async function getCurrentHeroImage(rawState: string | null): Promise<{
  url: string;
  photographer: string;
  photographerUrl: string;
  focalPointY: number;
  nextState: string | null;
} | null> {
  const selected = await listSelectedHeroImages();
  if (selected.length === 0) return null;

  const rotationEnabled = await getHeroRotationEnabled();

  if (!rotationEnabled) {
    // Single-active mode: return the one marked image, no state tracking
    const image = selected[0];
    return {
      url: s3CacheEnabled() ? getHeroCacheImageUrl(image.id) : image.url,
      photographer: image.photographer,
      photographerUrl: image.photographerUrl,
      focalPointY: image.focalPointY,
      nextState: null,
    };
  }

  const interval = await getHeroRotationInterval();
  const state = parseVisitorState(rawState);
  const result = pickHeroImage(selected, state, interval);
  if (!result) return null;

  return {
    url: s3CacheEnabled() ? getHeroCacheImageUrl(result.image.id) : result.image.url,
    photographer: result.image.photographer,
    photographerUrl: result.image.photographerUrl,
    focalPointY: result.image.focalPointY,
    nextState: encodeURIComponent(JSON.stringify(result.nextState)),
  };
}
