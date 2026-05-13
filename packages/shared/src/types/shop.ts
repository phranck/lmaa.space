import type { RegionCode, ShopVisibility } from "../constants/domain.js";

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
  deletedAt?: string | null;
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
  socialMedia: Record<string, string>;
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
  socialMedia: Record<string, string>;
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
