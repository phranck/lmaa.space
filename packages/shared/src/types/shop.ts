import type { RegionCode, ShopVisibility } from "../constants/domain.js";
import type { PaymentMethodKey } from "../constants/payment-methods.js";
import type { SocialMediaLinks } from "../utils/social-media.js";

/**
 * Normalized headquarters/address snapshot exposed through API models.
 */
export interface ShopHeadquarters {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  /**
   * Where the address was read, such as `Impressum` or `Kontaktseite`.
   *
   * @remarks
   * Kept because an address without its origin cannot be checked by whoever
   * reviews it, and the check that found it is the only place it comes from.
   */
  addressSource?: string | null;
  /** What produced the coordinates, such as `Photon (street-level)`. */
  geoSource?: string | null;
}

/**
 * Category subset embedded into shop responses.
 */
export interface ShopCategory {
  id: number;
  slug: string;
  name: string;
}

/**
 * Search-relevant metadata produced by shop checks.
 *
 * These fields are meant for matching and editorial context, not for direct
 * public rendering.
 */
export interface ShopCheckNotes {
  focus?: string[];
  brandsOrProducts?: string[];
  companyPresentation?: string | null;
}

/**
 * Compact shop representation for tables and cards.
 */
export interface ShopSummary {
  id: number;
  name: string;
  url: string;
  categories: ShopCategory[];
  region: RegionCode[];
  visibility: ShopVisibility;
  likeCount: number;
  deleteReason?: string | null;
  deletedWasReported?: boolean;
  /** When the row was created, which is when a shop entered the directory. */
  createdAt?: string;
  /**
   * When the shop reached the state `visibility` names.
   *
   * Null for a shop that has never left public view, and for the rows that
   * existed before the moment was recorded at all. Read it as
   * `visibilityChangedAt ?? createdAt`, so a shop admitted after a rejection
   * carries its admission rather than the day it was first entered.
   */
  visibilityChangedAt?: string | null;
  deletedByUsername?: string | null;
  deletedByFirstName?: string | null;
  deletedByLastName?: string | null;
  rejectionToken?: string | null;
  rejectionAdminNote?: string | null;
  rejectionLongText?: string | null;
}

/**
 * Admin list item with enough data to open the editor without a blocking detail fetch.
 */
export interface AdminShopListItem extends ShopSummary {
  description: string;
  shipping: string;
  contactEmail?: string | null;
  socialMedia: SocialMediaLinks;
  paymentMethods: PaymentMethodKey[];
  shopCheckNotes?: ShopCheckNotes | null;
  ogImage?: string | null;
  logoBackgroundColor: string | null;
  headquarters?: ShopHeadquarters | null;

  needsReview: boolean;
  reviewData?: Record<string, unknown> | null;

  reminder?: {
    remindAt: string;
    note: string | null;
    isActive: boolean;
  } | null;
}

/**
 * Full public shop model.
 */
export interface Shop {
  id: number;
  name: string;
  url: string;
  categories: ShopCategory[];
  region: RegionCode[];
  pickup: string;
  shipping: string;
  description: string;
  ogImage?: string | null;
  logoBackgroundColor: string | null;
  contactEmail?: string | null;
  socialMedia: SocialMediaLinks;
  paymentMethods: PaymentMethodKey[];
  shopCheckNotes?: ShopCheckNotes | null;
  visibility: ShopVisibility;
  /** @deprecated Legacy field, always `true`. Use `visibility` instead. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rejectionToken?: string | null;
  rejectionAdminNote?: string | null;
  rejectionLongText?: string | null;
  headquarters?: ShopHeadquarters | null;
  likeCount: number;
  likeToken?: string;

  needsReview: boolean;
  reviewData?: Record<string, unknown> | null;
}

/**
 * Payload for creating a new shop.
 */
export interface ShopCreate {
  name: string;
  url: string;
  categoryIds: number[];
  region?: RegionCode[];
  pickup?: string;
  shipping?: string;
  description?: string;
  contactEmail?: string;
  paymentMethods?: PaymentMethodKey[];
  shopCheckNotes?: ShopCheckNotes | null;
  headquarters?: Partial<ShopHeadquarters> | null;
}

/**
 * Partial update payload for editing a shop.
 */
export type ShopUpdate = Partial<ShopCreate>;

/**
 * Allowed recurrence patterns for shop reminders.
 */
export type ReminderRecurrence = "never" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

/**
 * Shop reminder owned by an admin user.
 */
export interface ShopReminder {
  id: number;
  shopId: number;
  remindAt: string;
  note: string | null;
  isActive: boolean;
  recurrence: ReminderRecurrence;
  recurrenceCustomDays: number | null;
  recurrenceUnit: "days" | "weeks" | "months" | "years" | null;
  recurrenceDaysOfWeek: string | null;
  sendEmail: boolean;
  emailTemplateId: number | null;
  createdAt: string;
}
