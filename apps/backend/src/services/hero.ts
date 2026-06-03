import { fetchUnsplashPhotoDetail } from "./unsplash.js";
import type { HeroImage } from "../db/schema.js";
import { HttpError } from "../lib/http.js";
import { deleteSetting, getSetting, putSetting } from "../repositories/app-settings.js";
import {
  clearHeroImageSelections,
  createHeroImage,
  deleteHeroImage,
  getHeroImageById,
  listHeroImages,
  listSelectedHeroImages,
  setHeroImageFocalPoint,
  setHeroImageSelected,
} from "../repositories/hero.js";
import {
  updateUnsplashImageLocation,
  upsertUnsplashImage,
} from "../repositories/unsplash-images.js";

export type AdminHeroImage = HeroImage & { isSocialPreview: boolean };

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
const SOCIAL_PREVIEW_IMAGE_KEY = "hero.socialPreviewImageId";

async function getSocialPreviewImageId(): Promise<number | null> {
  const value = await getSetting(SOCIAL_PREVIEW_IMAGE_KEY);
  if (!value) return null;
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function markSocialPreviewImage(
  images: HeroImage[],
  socialPreviewImageId: number | null,
): AdminHeroImage[] {
  return images.map((image) => ({
    ...image,
    isSocialPreview: image.id === socialPreviewImageId,
  }));
}

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

interface VisitorState {
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

export async function getAdminHeroImages(): Promise<AdminHeroImage[]> {
  const [images, socialPreviewImageId] = await Promise.all([
    listHeroImages(),
    getSocialPreviewImageId(),
  ]);
  return markSocialPreviewImage(images, socialPreviewImageId);
}

export async function addHeroImage(data: {
  unsplashId: string;
  url: string;
  urlSmall: string;
  photographer: string;
  photographerUrl: string;
  downloadLocation: string;
  width: number;
  height: number;
  color: string | null;
  blurHash: string | null;
  description: string | null;
  altDescription: string | null;
  likes: number;
  createdAt: string;
}): Promise<HeroImage> {
  const unsplashImage = await upsertUnsplashImage({
    unsplashId: data.unsplashId,
    urlSmall: data.urlSmall,
    urlRegular: data.url,
    width: data.width,
    height: data.height,
    color: data.color,
    blurHash: data.blurHash,
    description: data.description,
    altDescription: data.altDescription,
    likes: data.likes,
    photographerName: data.photographer,
    photographerUrl: data.photographerUrl,
    downloadLocation: data.downloadLocation,
    createdAtUnsplash: new Date(data.createdAt),
  });

  const image = await createHeroImage({
    unsplashImageId: unsplashImage.id,
    url: data.url,
    photographer: data.photographer,
    photographerUrl: data.photographerUrl,
    downloadLocation: data.downloadLocation,
  });

  // Background-fetch location data from Unsplash /photos/:id
  fetchUnsplashPhotoDetail(data.unsplashId)
    .then(async (location) => {
      if (location) {
        await updateUnsplashImageLocation(unsplashImage.id, location);
      }
    })
    .catch((err: unknown) => {
      console.error(`[unsplash-location] Failed to fetch location for ${data.unsplashId}:`, err);
    });

  return image;
}

export async function removeHeroImage(id: number): Promise<void> {
  const deleted = await deleteHeroImage(id);
  const socialPreviewImageId = await getSocialPreviewImageId();
  if (deleted && deleted.id === socialPreviewImageId) {
    await deleteSetting(SOCIAL_PREVIEW_IMAGE_KEY);
  }
}

export async function updateHeroImageFocalPoint(
  id: number,
  focalPointY: number,
): Promise<HeroImage> {
  return setHeroImageFocalPoint(id, Math.max(0, Math.min(100, Math.round(focalPointY))));
}

export async function toggleHeroImageSelected(id: number, selected: boolean): Promise<HeroImage> {
  if (selected) {
    const rotationEnabled = await getHeroRotationEnabled();
    if (!rotationEnabled) {
      await clearHeroImageSelections();
    }
  }
  return setHeroImageSelected(id, selected);
}

export async function toggleHeroImageSocialPreview({
  id,
  selected,
}: {
  id: number;
  selected: boolean;
}): Promise<AdminHeroImage> {
  const image = await getHeroImageById(id);
  if (!image) {
    throw new HttpError(404, "Hero image not found");
  }

  const currentSocialPreviewImageId = await getSocialPreviewImageId();
  if (selected) {
    await putSetting(SOCIAL_PREVIEW_IMAGE_KEY, String(id));
  } else if (currentSocialPreviewImageId === id) {
    await deleteSetting(SOCIAL_PREVIEW_IMAGE_KEY);
  }

  const socialPreviewImageId = selected ? id : await getSocialPreviewImageId();
  return { ...image, isSocialPreview: image.id === socialPreviewImageId };
}

/**
 * Returns the configured global social-media preview image for Open Graph and
 * Twitter cards. A missing or stale setting falls back to the frontend default.
 */
export async function getSocialPreviewImage(): Promise<{ url: string } | null> {
  const socialPreviewImageId = await getSocialPreviewImageId();
  if (!socialPreviewImageId) return null;

  const image = await getHeroImageById(socialPreviewImageId);
  if (!image) {
    await deleteSetting(SOCIAL_PREVIEW_IMAGE_KEY);
    return null;
  }

  return { url: image.url };
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
    const image = selected[0];
    return {
      url: image.url,
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
    url: result.image.url,
    photographer: result.image.photographer,
    photographerUrl: result.image.photographerUrl,
    focalPointY: result.image.focalPointY,
    nextState: encodeURIComponent(JSON.stringify(result.nextState)),
  };
}
