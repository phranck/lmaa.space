import type { AdminShopListItem, ShopVisibility } from "@lmaa/shared";

/**
 * Which label the date column carries, as a key of `shops.table.dates`.
 *
 * A key rather than a sentence, so the wording stays in the message catalogue
 * and both languages say the same thing about the same row.
 */
export type ShopRowDateLabel = "admitted" | "onhold" | "rejected" | "deleted";

/** The date a shop row states, and what that date is about. */
export interface ShopRowDate {
  /** The moment itself, as it came from the interface. */
  iso: string;
  /** Which of the four labels belongs beside it. */
  label: ShopRowDateLabel;
  /** Milliseconds since the epoch, which is what the column sorts on. */
  sortValue: number;
}

/** What each visibility calls the moment it was reached. */
const LABEL_BY_VISIBILITY: Record<ShopVisibility, ShopRowDateLabel> = {
  public: "admitted",
  onhold: "onhold",
  rejected: "rejected",
  deleted: "deleted",
};

/** What a row sorts as when it carries no readable date at all. */
const NO_DATE_SORT_VALUE = 0;

/**
 * Reads the one date a shop row shows.
 *
 * @param shop - The row, of which only the visibility and the two timestamps
 *   are read.
 * @returns The date and its label, or `null` where the row carries neither
 *   timestamp.
 *
 * @remarks
 * `visibilityChangedAt` wins over `createdAt`, which is what makes a shop
 * admitted after a rejection show its admission rather than the day it was
 * first entered. It is null for every shop that has never left public view, and
 * for the rows that already existed when the moment started being recorded, so
 * the fallback is the ordinary case rather than the exception.
 */
export function resolveShopRowDate(
  shop: Pick<AdminShopListItem, "visibility" | "createdAt" | "visibilityChangedAt">,
): ShopRowDate | null {
  const iso = shop.visibilityChangedAt ?? shop.createdAt;
  if (!iso) return null;

  const sortValue = Date.parse(iso);
  return {
    iso,
    label: LABEL_BY_VISIBILITY[shop.visibility],
    sortValue: Number.isNaN(sortValue) ? NO_DATE_SORT_VALUE : sortValue,
  };
}

/**
 * What the date column sorts one row by.
 *
 * @param shop - The row.
 * @returns Milliseconds since the epoch, and zero where there is no date, so
 *   rows without one gather at one end instead of scattering through the list.
 */
export function shopRowDateSortValue(
  shop: Pick<AdminShopListItem, "visibility" | "createdAt" | "visibilityChangedAt">,
): number {
  return resolveShopRowDate(shop)?.sortValue ?? NO_DATE_SORT_VALUE;
}
