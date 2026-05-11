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
import type { ShopCheckNotes } from "@lmaa/shared";

function quotedTextSql(values: readonly string[]) {
  return sql.join(
    values.map((value) => sql.raw(`'${value.replaceAll("'", "''")}'`)),
    sql`, `,
  );
}

const POSTING_PLATFORM_SQL = quotedTextSql(["mastodon", "bluesky"]);
const SOCIAL_MEDIA_POST_TEMPLATE_SCOPE_SQL = quotedTextSql(["submission", "category"]);

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
  unsplashImageId: integer("unsplash_image_id"),
  imageUrl: text("image_url"),
  imagePhotographer: text("image_photographer"),
  imagePhotographerUrl: text("image_photographer_url"),
  imageFocalPointY: integer("image_focal_point_y").notNull().default(50),
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
    shopCheckNotes: jsonb("shop_check_notes").$type<ShopCheckNotes | null>(),
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
    likeCount: integer("like_count").notNull().default(0),
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
 * Idempotent public like state per shop and anonymous visitor key.
 */
export const shopLikes = pgTable(
  "shop_likes",
  {
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    visitorKey: text("visitor_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.shopId, table.visitorKey] }),
    index("idx_shop_likes_visitor").on(table.visitorKey),
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
    uiPreferences: jsonb("ui_preferences").$type<{ sidebarSectionOrder?: string[] }>(),
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
    shopCheckNotes: jsonb("shop_check_notes").$type<ShopCheckNotes | null>(),
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
 * Inferred select type for `shop_likes`.
 */
export type ShopLike = typeof shopLikes.$inferSelect;
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

/**
 * Social media accounts managed from the dashboard. Stores profile URLs for all
 * supported platforms; for Mastodon and Bluesky additionally stores posting
 * credentials when `canPost = true`. Partial unique index enforces "at most one
 * posting account per platform"; profile-only duplicates per platform are allowed.
 */
export const socialMediaAccounts = pgTable(
  "social_media_accounts",
  {
    id: serial("id").primaryKey(),
    platform: text("platform").notNull(),
    label: text("label").notNull(),
    profileUrl: text("profile_url").notNull(),
    canPost: boolean("can_post").notNull().default(false),
    showInFooter: boolean("show_in_footer").notNull().default(true),
    instanceUrl: text("instance_url").notNull().default(""),
    handle: text("handle"),
    username: text("username"),
    accessToken: text("access_token"),
    visibility: text("visibility").$type<"public" | "unlisted" | "private" | "direct">(),
    maxPostCharacters: integer("max_post_characters"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("social_media_accounts_post_unique")
      .on(table.platform)
      .where(sql`${table.canPost} = true`),
    index("idx_social_media_accounts_platform_active").on(table.platform, table.isActive),
    check(
      "social_media_accounts_visibility_check",
      sql`${table.visibility} IS NULL OR ${table.visibility} IN ('public', 'unlisted', 'private', 'direct')`,
    ),
    check(
      "social_media_accounts_can_post_platform",
      sql`${table.canPost} = false OR ${table.platform} IN (${POSTING_PLATFORM_SQL})`,
    ),
    check(
      "social_media_accounts_can_post_token",
      sql`${table.canPost} = false OR ${table.accessToken} IS NOT NULL`,
    ),
    check(
      "social_media_accounts_can_post_max_chars",
      sql`${table.canPost} = false OR ${table.maxPostCharacters} IS NOT NULL`,
    ),
    check(
      "social_media_accounts_handle_required_for_bluesky",
      sql`${table.canPost} = false OR ${table.platform} <> 'bluesky' OR ${table.handle} IS NOT NULL`,
    ),
    check(
      "social_media_accounts_instance_required_for_mastodon",
      sql`${table.canPost} = false OR ${table.platform} <> 'mastodon' OR ${table.instanceUrl} <> ''`,
    ),
  ],
);

export type SocialMediaAccount = typeof socialMediaAccounts.$inferSelect;
export type SocialMediaAccountInsert = typeof socialMediaAccounts.$inferInsert;

/**
 * Plain-text templates used for automatic social-media posts.
 * `platforms` lists the platforms a template can be sent to (currently only "mastodon"
 * after the Plan 1 migration; "bluesky" is added by the BlueSky setup plan). Each
 * platform has its own body column that must be non-null when the platform is selected.
 */
export const socialMediaPostTemplates = pgTable(
  "social_media_post_templates",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    platforms: text("platforms").array().notNull(),
    scopes: text("scopes")
      .array()
      .$type<Array<"submission" | "category">>()
      .notNull()
      .default(sql`ARRAY['submission']::text[]`),
    bodyMastodon: text("body_mastodon"),
    bodyBluesky: text("body_bluesky"),
    isSystemTemplate: boolean("is_system_template").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "social_media_post_templates_platforms_nonempty",
      sql`cardinality(${table.platforms}) >= 1`,
    ),
    check(
      "social_media_post_templates_body_mastodon_when_selected",
      sql`array_position(${table.platforms}, 'mastodon') IS NULL OR ${table.bodyMastodon} IS NOT NULL`,
    ),
    check(
      "social_media_post_templates_body_bluesky_when_selected",
      sql`array_position(${table.platforms}, 'bluesky') IS NULL OR ${table.bodyBluesky} IS NOT NULL`,
    ),
    check(
      "social_media_post_templates_scopes_nonempty",
      sql`cardinality(${table.scopes}) >= 1`,
    ),
    check(
      "social_media_post_templates_scopes_valid",
      sql`${table.scopes} <@ ARRAY[${SOCIAL_MEDIA_POST_TEMPLATE_SCOPE_SQL}]::text[]`,
    ),
  ],
);

export type SocialMediaPostTemplate = typeof socialMediaPostTemplates.$inferSelect;
export type SocialMediaPostTemplateInsert = typeof socialMediaPostTemplates.$inferInsert;

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

// ---------------------------------------------------------------------------
// Hero Images
// ---------------------------------------------------------------------------

export type HeroScheduleSlot = {
  slot: number;
  time: string; // "HH:MM" in local time (Europe/Berlin)
  imageId: number;
};

/**
 * Shared Unsplash image metadata -- referenced by hero_images, categories,
 * and any future feature that uses Unsplash photos.
 */
export const unsplashImages = pgTable("unsplash_images", {
  id: serial("id").primaryKey(),
  unsplashId: text("unsplash_id").notNull().unique(),
  urlSmall: text("url_small").notNull(),
  urlRegular: text("url_regular").notNull(),
  width: integer("width"),
  height: integer("height"),
  color: text("color"),
  blurHash: text("blur_hash"),
  description: text("description"),
  altDescription: text("alt_description"),
  likes: integer("likes"),
  photographerName: text("photographer_name").notNull(),
  photographerUrl: text("photographer_url").notNull(),
  downloadLocation: text("download_location").notNull(),
  locationCity: text("location_city"),
  locationCountry: text("location_country"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  locationFetched: boolean("location_fetched").notNull().default(false),
  createdAtUnsplash: timestamp("created_at_unsplash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UnsplashImage = typeof unsplashImages.$inferSelect;
export type UnsplashImageInsert = typeof unsplashImages.$inferInsert;

/**
 * Pool of Unsplash images available for the homepage hero banner.
 */
export const heroImages = pgTable("hero_images", {
  id: serial("id").primaryKey(),
  unsplashImageId: integer("unsplash_image_id").references(() => unsplashImages.id, {
    onDelete: "set null",
  }),
  url: text("url").notNull(),
  photographer: text("photographer").notNull(),
  photographerUrl: text("photographer_url").notNull(),
  downloadLocation: text("download_location").notNull(),
  isSelected: boolean("is_selected").notNull().default(false),
  focalPointY: integer("focal_point_y").notNull().default(50),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type HeroImage = typeof heroImages.$inferSelect;

/**
 * Daily hero rotation schedule -- one row per day, lazy-generated on first request.
 */
export const heroDailySchedule = pgTable("hero_daily_schedule", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(), // ISO date "YYYY-MM-DD"
  schedule: jsonb("schedule").$type<HeroScheduleSlot[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Background Errors (Sentry-style async failure log)
// ---------------------------------------------------------------------------

/**
 * Generic background-error log capturing per-account async failures.
 * Sources: "mastodon-post", "shop-reminders", and future async services.
 */
export const backgroundErrors = pgTable(
  "background_errors",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    message: text("message").notNull(),
    context: jsonb("context").$type<Record<string, unknown> | null>(),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: integer("resolved_by").references(() => adminUsers.id, { onDelete: "set null" }),
  },
  (table) => [
    index("idx_background_errors_source").on(table.source),
    index("idx_background_errors_unresolved")
      .on(table.occurredAt)
      .where(sql`${table.resolvedAt} IS NULL`),
  ],
);

export type BackgroundError = typeof backgroundErrors.$inferSelect;

// ---------------------------------------------------------------------------
// Per-Moderator Sticky Template Choice
// ---------------------------------------------------------------------------

/**
 * Per-moderator sticky template selection per social-media account. Used to pre-select
 * the template dropdown on the Approve dialog. `templateId IS NULL` means the moderator
 * has explicitly chosen "no post" for this account at last approve.
 */
export const adminUserAccountTemplateChoice = pgTable(
  "admin_user_account_template_choice",
  {
    adminUserId: integer("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    socialMediaAccountId: integer("social_media_account_id")
      .notNull()
      .references(() => socialMediaAccounts.id, { onDelete: "cascade" }),
    scope: text("scope")
      .$type<"submission" | "category">()
      .notNull()
      .default("submission"),
    templateId: integer("template_id").references(() => socialMediaPostTemplates.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.adminUserId, table.socialMediaAccountId, table.scope] }),
    index("idx_admin_user_account_template_choice_user").on(table.adminUserId),
    check(
      "admin_user_account_template_choice_scope_valid",
      sql`${table.scope} IN ('submission', 'category')`,
    ),
  ],
);

export type AdminUserAccountTemplateChoice = typeof adminUserAccountTemplateChoice.$inferSelect;
export type AdminUserAccountTemplateChoiceInsert =
  typeof adminUserAccountTemplateChoice.$inferInsert;
