import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { FooterConfig, FormConfigPayload, MarkdownWidgetsConfig } from "@lmaa/contracts";
import type { AffiliateScanJobError } from "@lmaa/shared";

/**
 * Category taxonomy table used for catalog filtering and shop assignment.
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default(""),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  imageUrl: text("image_url"),
  imagePhotographer: text("image_photographer"),
  imagePhotographerUrl: text("image_photographer_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Shop directory table containing canonical metadata and moderation state.
 */
export const shops = pgTable(
  "shops",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    region: jsonb("region").$type<string[]>().notNull().default([]),
    pickup: text("pickup").notNull().default(""),
    shipping: text("shipping").notNull().default(""),
    description: text("description").notNull().default(""),
    ogImage: text("og_image"),
    socialMedia: jsonb("social_media").$type<Record<string, string>>().notNull().default({}),
    contactEmail: text("contact_email"),
    /** @deprecated Legacy field, always `true`. Use `visibility` instead. */
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    visibility: text("visibility")
      .$type<"public" | "onhold" | "deleted" | "rejected">()
      .notNull()
      .default("public"),
    deletedBy: integer("deleted_by").references(() => adminUsers.id, { onDelete: "set null" }),
    deleteReason: text("delete_reason"),
    deletedWasReported: boolean("deleted_was_reported").notNull().default(false),
    rejectionToken: text("rejection_token").unique(),
    rejectionAdminNote: text("rejection_admin_note"),
    rejectionLongText: text("rejection_long_text"),
    needsReview: boolean("needs_review").notNull().default(false),
    reviewData: jsonb("review_data").$type<Record<string, unknown> | null>(),
  },
  (table) => [
    index("idx_shops_active").on(table.isActive),
    index("idx_shops_visibility").on(table.visibility),
    check(
      "shops_visibility_check",
      sql`${table.visibility} IN ('public', 'onhold', 'deleted', 'rejected')`,
    ),
  ],
);

/**
 * Normalized country lookup for imported shop headquarters data.
 */
export const shopGeoCountries = pgTable("shop_geo_countries", {
  code: text("code").primaryKey(),
  name: text("name").notNull().default(""),
});

/**
 * Normalized state/region lookup for imported shop headquarters data.
 */
export const shopGeoRegions = pgTable(
  "shop_geo_regions",
  {
    id: serial("id").primaryKey(),
    countryCode: text("country_code")
      .notNull()
      .references(() => shopGeoCountries.code, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [
    unique("shop_geo_regions_country_name_unique").on(table.countryCode, table.name),
    index("idx_shop_geo_regions_country").on(table.countryCode),
  ],
);

/**
 * Normalized city lookup for imported shop headquarters data.
 */
export const shopGeoCities = pgTable(
  "shop_geo_cities",
  {
    id: serial("id").primaryKey(),
    countryCode: text("country_code")
      .notNull()
      .references(() => shopGeoCountries.code, { onDelete: "cascade" }),
    regionId: integer("region_id").references(() => shopGeoRegions.id, { onDelete: "set null" }),
    name: text("name").notNull(),
  },
  (table) => [
    unique("shop_geo_cities_country_region_name_unique").on(
      table.countryCode,
      table.regionId,
      table.name,
    ),
    index("idx_shop_geo_cities_country").on(table.countryCode),
    index("idx_shop_geo_cities_region").on(table.regionId),
  ],
);

/**
 * Imported headquarters/address and geocoding data keyed by shop.
 */
export const shopHeadquarters = pgTable(
  "shop_headquarters",
  {
    shopId: integer("shop_id")
      .primaryKey()
      .references(() => shops.id, { onDelete: "cascade" }),
    countryCode: text("country_code")
      .notNull()
      .references(() => shopGeoCountries.code, { onDelete: "restrict" }),
    regionId: integer("region_id").references(() => shopGeoRegions.id, { onDelete: "set null" }),
    cityId: integer("city_id").references(() => shopGeoCities.id, { onDelete: "set null" }),
    street: text("street"),
    postalCode: text("postal_code"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    addressSource: text("address_source"),
    geoSource: text("geo_source"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_shop_headquarters_country").on(table.countryCode),
    index("idx_shop_headquarters_region").on(table.regionId),
    index("idx_shop_headquarters_city").on(table.cityId),
  ],
);


/**
 * Join table linking shops to categories.
 */
export const shopCategories = pgTable(
  "shop_categories",
  {
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.shopId, table.categoryId] }),
    index("idx_sc_category").on(table.categoryId),
  ],
);

/**
 * Dashboard admin user accounts.
 */
export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    locale: text("locale").$type<"de" | "en">().notNull().default("de"),
    passwordHash: text("password_hash"),
    inviteTokenHash: text("invite_token_hash"),
    inviteExpiresAt: timestamp("invite_expires_at"),
    isOwner: boolean("is_owner").notNull().default(false),
    role: text("role").$type<"owner" | "admin" | "moderator">().notNull().default("admin"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (table) => [
    uniqueIndex("admin_users_single_owner_idx")
      .on(table.role)
      .where(sql`${table.role} = 'owner'`),
    uniqueIndex("admin_users_invite_token_idx")
      .on(table.inviteTokenHash)
      .where(sql`${table.inviteTokenHash} IS NOT NULL`),
  ],
);

/**
 * Raw user shop submissions awaiting moderation.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    shopName: text("shop_name").notNull(),
    shopUrl: text("shop_url").notNull(),
    region: jsonb("region").$type<string[]>().notNull().default([]),
    pickup: text("pickup").notNull().default(""),
    shipping: text("shipping").notNull().default(""),
    description: text("description").notNull().default(""),
    ogImage: text("og_image"),
    socialMedia: jsonb("social_media").$type<Record<string, string>>().notNull().default({}),
    contactEmail: text("contact_email"),
    submitterEmail: text("submitter_email"),
    submitterNote: text("submitter_note"),
    status: text("status")
      .$type<"pending" | "onhold" | "approved" | "rejected">()
      .notNull()
      .default("pending"),
    adminNote: text("admin_note"),
    rejectionLongText: text("rejection_long_text"),
    rejectionToken: text("rejection_token").unique(),
    feedbackSent: boolean("feedback_sent").notNull().default(false),
    readyForReview: boolean("ready_for_review").notNull().default(false),
    reviewedBy: integer("reviewed_by").references(() => adminUsers.id),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_submissions_status").on(table.status)],
);

/**
 * Join table linking submissions to suggested categories.
 */
export const submissionCategories = pgTable(
  "submission_categories",
  {
    submissionId: integer("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.submissionId, table.categoryId] }),
    index("idx_scat_submission").on(table.submissionId),
  ],
);

/**
 * Imported or manually maintained headquarters/address data for submissions.
 */
export const submissionHeadquarters = pgTable(
  "submission_headquarters",
  {
    submissionId: integer("submission_id")
      .primaryKey()
      .references(() => submissions.id, { onDelete: "cascade" }),
    countryCode: text("country_code")
      .notNull()
      .references(() => shopGeoCountries.code, { onDelete: "restrict" }),
    regionId: integer("region_id").references(() => shopGeoRegions.id, { onDelete: "set null" }),
    cityId: integer("city_id").references(() => shopGeoCities.id, { onDelete: "set null" }),
    street: text("street"),
    postalCode: text("postal_code"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    addressSource: text("address_source"),
    geoSource: text("geo_source"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_submission_headquarters_country").on(table.countryCode),
    index("idx_submission_headquarters_region").on(table.regionId),
    index("idx_submission_headquarters_city").on(table.cityId),
  ],
);

/**
 * Session store for dashboard authentication.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    adminUserId: integer("admin_user_id")
      .notNull()
      .references(() => adminUsers.id),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_sessions_expires").on(table.expiresAt)],
);

/**
 * Shared rate-limit bucket store used across backend instances.
 */
export const rateLimitEntries = pgTable(
  "rate_limit_entries",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    resetAt: timestamp("reset_at").notNull(),
  },
  (table) => [index("idx_rate_limit_entries_reset_at").on(table.resetAt)],
);

/**
 * User-reported dead-link incidents grouped by shop.
 */
export const deadLinkReports = pgTable(
  "dead_link_reports",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    reportedAt: timestamp("reported_at").defaultNow().notNull(),
  },
  (table) => [index("idx_dlr_shop").on(table.shopId)],
);

/**
 * CMS-like content pages used by the frontend (privacy policy, about, etc.).
 */
export const contentPages = pgTable("content_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  status: text("status").$type<"draft" | "published" | "hidden">().notNull().default("draft"),
  showTitle: boolean("show_title").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
});

/**
 * Uploaded media assets managed through the dashboard media library.
 */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: serial("id").primaryKey(),
    displayName: text("display_name").notNull(),
    originalName: text("original_name").notNull(),
    storedFilename: text("stored_filename").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    kind: text("kind").$type<"image" | "document">().notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    alias: text("alias"),
    createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  },
  (table) => [
    index("idx_media_assets_kind").on(table.kind),
    index("idx_media_assets_created_at").on(table.createdAt),
    uniqueIndex("idx_media_assets_alias").on(table.alias),
  ],
);

/**
 * Configurable header/footer navigation items.
 */
export const navItems = pgTable(
  "nav_items",
  {
    id: serial("id").primaryKey(),
    navId: text("nav_id").$type<"header" | "footer">().notNull(),
    pageSlug: text("page_slug").references(() => contentPages.slug, { onDelete: "cascade" }),
    url: text("url"),
    target: text("target").$type<"_self" | "_blank">().notNull().default("_self"),
    position: integer("position").notNull().default(0),
    label: text("label"),
  },
  (table) => [index("idx_nav_items_nav").on(table.navId)],
);

/**
 * Inferred select type for `content_pages`.
 */
export type ContentPage = typeof contentPages.$inferSelect;
/**
 * Inferred select type for `media_assets`.
 */
export type MediaAsset = typeof mediaAssets.$inferSelect;
/**
 * Inferred select type for `nav_items`.
 */
export type NavItem = typeof navItems.$inferSelect;
/**
 * Inferred select type for `categories`.
 */
export type Category = typeof categories.$inferSelect;
/**
 * Inferred insert type for `categories`.
 */
export type CategoryInsert = typeof categories.$inferInsert;
/**
 * Inferred select type for `shops`.
 */
export type Shop = typeof shops.$inferSelect;
/**
 * Inferred insert type for `shops`.
 */
export type ShopInsert = typeof shops.$inferInsert;
/**
 * Inferred select type for `shop_categories`.
 */
export type ShopCategory = typeof shopCategories.$inferSelect;
/**
 * Inferred select type for `submissions`.
 */
export type Submission = typeof submissions.$inferSelect;
/**
 * Inferred insert type for `submissions`.
 */
export type SubmissionInsert = typeof submissions.$inferInsert;
/**
 * Inferred select type for `submission_categories`.
 */
export type SubmissionCategory = typeof submissionCategories.$inferSelect;
/**
 * Inferred select type for `admin_users`.
 */
export type AdminUser = typeof adminUsers.$inferSelect;
/**
 * Inferred insert type for `admin_users`.
 */
export type AdminUserInsert = typeof adminUsers.$inferInsert;
/**
 * Inferred select type for `sessions`.
 */
export type Session = typeof sessions.$inferSelect;
export type RateLimitEntryRow = typeof rateLimitEntries.$inferSelect;
/**
 * Inferred select type for `dead_link_reports`.
 */
export type DeadLinkReport = typeof deadLinkReports.$inferSelect;

/**
 * User-submitted moderation concerns for suspicious shops.
 */
export const shopConcernReports = pgTable(
  "shop_concern_reports",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    ipHash: text("ip_hash").notNull(),
    reportedAt: timestamp("reported_at").defaultNow().notNull(),
  },
  (table) => [index("idx_scr_shop").on(table.shopId)],
);

/**
 * Inferred select type for `shop_concern_reports`.
 */
export type ShopConcernReport = typeof shopConcernReports.$inferSelect;

/**
 * Named form configurations for dynamic form rendering on the frontend.
 */
export const formConfigs = pgTable("form_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").unique(),
  config: jsonb("config").$type<FormConfigPayload>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Inferred select type for `form_configs`.
 */
export type FormConfigRow = typeof formConfigs.$inferSelect;

/**
 * Generic form submission records stored by the submission chain.
 */
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formConfigId: integer("form_config_id")
    .notNull()
    .references(() => formConfigs.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Inferred select type for `form_submissions`.
 */
export type FormSubmissionRow = typeof formSubmissions.$inferSelect;

/**
 * Singleton table holding the website footer configuration (id always = 1).
 */
export const footerConfig = pgTable("footer_config", {
  id: integer("id").primaryKey().default(1),
  config: jsonb("config").$type<FooterConfig>().notNull().default({ columns: [] }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Inferred select type for `footer_config`.
 */
export type FooterConfigRow = typeof footerConfig.$inferSelect;

/**
 * Singleton table holding globally configurable markdown widgets.
 */
export const markdownWidgets = pgTable("markdown_widgets", {
  id: integer("id").primaryKey().default(1),
  config: jsonb("config").$type<MarkdownWidgetsConfig>().notNull().default({ widgets: [] }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Inferred select type for `markdown_widgets`.
 */
export type MarkdownWidgetsRow = typeof markdownWidgets.$inferSelect;

/**
 * Email templates used for transactional and system notifications.
 */
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  subject: text("subject").notNull().default(""),
  headerBannerUrl: text("header_banner_url"),
  headerText: text("header_text"),
  bodyText: text("body_text").notNull().default(""),
  footerBannerUrl: text("footer_banner_url"),
  footerText: text("footer_text"),
  isSystemTemplate: boolean("is_system_template").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Inferred select type for `email_templates`.
 */
export type EmailTemplate = typeof emailTemplates.$inferSelect;
/**
 * Inferred insert type for `email_templates`.
 */
export type EmailTemplateInsert = typeof emailTemplates.$inferInsert;


// ---------------------------------------------------------------------------
// Affiliate Scans
// ---------------------------------------------------------------------------

/**
 * One affiliate scan result per shop (upsert on shopId).
 */
export const affiliateScans = pgTable(
  "affiliate_scans",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id")
      .notNull()
      .unique()
      .references(() => shops.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<"direct" | "network" | "inquiry" | "none">()
      .notNull()
      .default("none"),
    programFound: boolean("program_found").notNull().default(false),
    programType: text("program_type"),
    programUrl: text("program_url"),
    networkName: text("network_name"),
    compensationModel: text("compensation_model"),
    commission: text("commission"),
    cookieDuration: text("cookie_duration"),
    payoutThreshold: text("payout_threshold"),
    applicationUrl: text("application_url"),
    contactEmail: text("contact_email"),
    requirements: text("requirements"),
    notes: text("notes"),
    recommendation: text("recommendation"),
    trackingStatus: text("tracking_status")
      .$type<"open" | "contacted" | "confirmed" | "rejected" | "closed">()
      .notNull()
      .default("open"),
    trackingNote: text("tracking_note"),
    scannedAt: timestamp("scanned_at").defaultNow().notNull(),
    scannedBy: integer("scanned_by").references(() => adminUsers.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_affiliate_scans_status").on(table.status),
    index("idx_affiliate_scans_tracking").on(table.trackingStatus),
    check(
      "affiliate_scans_status_check",
      sql`${table.status} IN ('direct', 'network', 'inquiry', 'none')`,
    ),
    check(
      "affiliate_scans_tracking_check",
      sql`${table.trackingStatus} IN ('open', 'contacted', 'confirmed', 'rejected', 'closed')`,
    ),
  ],
);

export type AffiliateScan = typeof affiliateScans.$inferSelect;
export type AffiliateScanInsert = typeof affiliateScans.$inferInsert;

/**
 * Batch scan job progress tracking.
 */
export const affiliateScanJobs = pgTable("affiliate_scan_jobs", {
  id: serial("id").primaryKey(),
  status: text("status")
    .$type<"pending" | "running" | "completed" | "failed" | "cancelled">()
    .notNull()
    .default("pending"),
  totalShops: integer("total_shops").notNull().default(0),
  completedShops: integer("completed_shops").notNull().default(0),
  failedShops: integer("failed_shops").notNull().default(0),
  errors: jsonb("errors").$type<AffiliateScanJobError[]>().notNull().default([]),
  startedBy: integer("started_by").references(() => adminUsers.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type AffiliateScanJob = typeof affiliateScanJobs.$inferSelect;
export type AffiliateScanJobInsert = typeof affiliateScanJobs.$inferInsert;


// ---------------------------------------------------------------------------
// App Settings (generic key/value store)
// ---------------------------------------------------------------------------

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// ---------------------------------------------------------------------------
// Shop Reminders
// ---------------------------------------------------------------------------

export const shopReminders = pgTable("shop_reminders", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id")
    .notNull()
    .unique()
    .references(() => shops.id, { onDelete: "cascade" }),
  adminId: integer("admin_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  remindAt: timestamp("remind_at").notNull(),
  note: text("note"),
  isActive: boolean("is_active").notNull().default(true),
  recurrence: text("recurrence")
    .$type<"never" | "daily" | "weekly" | "monthly" | "yearly" | "custom">()
    .notNull()
    .default("never"),
  recurrenceCustomDays: integer("recurrence_custom_days"),
  recurrenceUnit: text("recurrence_unit")
    .$type<"days" | "weeks" | "months" | "years">()
    .default("days"),
  recurrenceDaysOfWeek: text("recurrence_days_of_week"),
  sendEmail: boolean("send_email").notNull().default(false),
  emailTemplateId: integer("email_template_id").references(() => emailTemplates.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ShopReminderRow = typeof shopReminders.$inferSelect;

// ---------------------------------------------------------------------------
// Push Subscriptions
// ---------------------------------------------------------------------------

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
