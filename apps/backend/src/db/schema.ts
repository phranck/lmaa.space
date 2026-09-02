import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  foreignKey,
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
  uuid,
} from "drizzle-orm/pg-core";

import type {
  FooterConfig,
  FormConfigPayload,
  SocialPreviewComposition,
  SocialPreviewFormat,
  SupportPromptButtonAlignment,
  SupportPromptSlot,
  SupportPromptThresholdBasis,
} from "@lmaa/contracts";
import type {
  MediaFolderColor,
  MediaKind,
  PaymentMethodKey,
  ReviewAttemptRecord,
  ReviewAutomationMode,
  ReviewEvidenceSource,
  ReviewJobState,
  ReviewReportState,
  ReviewUsage,
  ReviewVerdict,
  ShopCheckNotes,
  SocialMediaLinks,
} from "@lmaa/shared";

const POSTING_PLATFORM_SQL = sql`'mastodon', 'bluesky'`;
const SOCIAL_MEDIA_POST_TEMPLATE_SCOPE_SQL = sql`'submission', 'category'`;

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
    logoBackgroundColor: text("logo_background_color"),
    socialMedia: jsonb("social_media").$type<SocialMediaLinks>().notNull().default([]),
    paymentMethods: jsonb("payment_methods").$type<PaymentMethodKey[]>().notNull().default([]),
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
    /** Suggestion this shop was admitted from, `null` for shops entered by hand. */
    submissionId: integer("submission_id")
      .unique()
      .references(() => submissions.id, { onDelete: "set null" }),
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
    logoBackgroundColor: text("logo_background_color"),
    socialMedia: jsonb("social_media").$type<SocialMediaLinks>().notNull().default([]),
    paymentMethods: jsonb("payment_methods").$type<PaymentMethodKey[]>().notNull().default([]),
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
  contentWidth: text("content_width")
    .$type<"default" | "wide" | "full">()
    .notNull()
    .default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
});

/**
 * Dashboard media library folders.
 */
export const mediaFolders = pgTable(
  "media_folders",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    parentId: integer("parent_id"),
    color: text("color").$type<MediaFolderColor>(),
    systemKey: text("system_key").unique(),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  },
  (table) => [
    index("idx_media_folders_parent").on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "media_folders_parent_fk",
    }).onDelete("cascade"),
    uniqueIndex("idx_media_folders_parent_name")
      .on(table.parentId, table.name)
      .where(sql`${table.parentId} IS NOT NULL`),
    uniqueIndex("idx_media_folders_root_name")
      .on(table.name)
      .where(sql`${table.parentId} IS NULL`),
  ],
);

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
    posterStoredFilename: text("poster_stored_filename"),
    mimeType: text("mime_type").notNull(),
    kind: text("kind").$type<MediaKind>().notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    alias: text("alias"),
    createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    folderId: integer("folder_id").references(() => mediaFolders.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_media_assets_kind").on(table.kind),
    index("idx_media_assets_created_at").on(table.createdAt),
    index("idx_media_assets_folder").on(table.folderId),
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
    check("social_media_post_templates_scopes_nonempty", sql`cardinality(${table.scopes}) >= 1`),
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
  // Until when one container has the exclusive right to send this reminder.
  // Every container runs its own scheduler, so without a claim a due reminder
  // is read and sent by all of them. An expiring lease is also what turns a
  // failed send back into a retry, because nothing else releases the claim.
  claimedUntil: timestamp("claimed_until"),
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
 * Editable social preview projects managed from the dashboard.
 */
export const socialPreviewProjects = pgTable(
  "social_preview_projects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    composition: jsonb("composition").$type<SocialPreviewComposition>().notNull(),
    createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_social_preview_projects_created_at").on(table.createdAt)],
);

export type SocialPreviewProject = typeof socialPreviewProjects.$inferSelect;
export type SocialPreviewProjectInsert = typeof socialPreviewProjects.$inferInsert;

/**
 * Rendered global Open Graph/Twitter preview images managed from the dashboard.
 */
export const socialPreviewImages = pgTable(
  "social_preview_images",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    imageUrl: text("image_url").notNull(),
    mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    composition: jsonb("composition").$type<SocialPreviewComposition>().notNull(),
    width: integer("width").notNull().default(1200),
    height: integer("height").notNull().default(630),
    format: text("format").$type<SocialPreviewFormat>().notNull().default("image/jpeg"),
    quality: integer("quality").notNull().default(90),
    sizeBytes: integer("size_bytes").notNull().default(0),
    createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_social_preview_images_created_at").on(table.createdAt),
    check(
      "social_preview_images_format_check",
      sql`${table.format} IN ('image/jpeg', 'image/png', 'image/webp')`,
    ),
  ],
);

export type SocialPreviewImage = typeof socialPreviewImages.$inferSelect;
export type SocialPreviewImageInsert = typeof socialPreviewImages.$inferInsert;

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
    scope: text("scope").$type<"submission" | "category">().notNull().default("submission"),
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

// ---------------------------------------------------------------------------
// Automated Shop Review
// ---------------------------------------------------------------------------

const REVIEW_JOB_STATE_SQL = sql`'queued', 'running', 'provider_waiting', 'applying', 'completed', 'failed', 'cancelled'`;
const REVIEW_JOB_ACTIVE_STATE_SQL = sql`'queued', 'running', 'provider_waiting', 'applying'`;
const REVIEW_VERDICT_SQL = sql`'accept', 'reject', 'onhold'`;
const REVIEW_MODE_SQL = sql`'off', 'assist'`;
const REVIEW_REPORT_STATE_SQL = sql`'pending', 'sending', 'sent', 'failed', 'skipped'`;

/**
 * One automated review run per shop submission.
 *
 * @remarks
 * The execution state lives here and the moderation outcome stays in
 * `submissions.status`, so neither column has to carry the other's meaning.
 *
 * Per-attempt usage and cost sit in `attempts` rather than in a second table.
 * A retry belongs to the same check, and splitting it off would mean joining
 * two rows back together everywhere the cost of a check is needed.
 *
 * Money is a `bigint` count of nano-units of `cost_currency`, so one euro is
 * 1 000 000 000. Provider rates are fractions of a cent per token and binary
 * floating point cannot represent them exactly.
 */
export const reviewJobs = pgTable(
  "review_jobs",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    state: text("state").$type<ReviewJobState>().notNull().default("queued"),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    mode: text("mode").$type<ReviewAutomationMode>().notNull().default("off"),
    synthetic: boolean("synthetic").notNull().default(false),
    verdict: text("verdict").$type<ReviewVerdict>(),
    provider: text("provider"),
    model: text("model"),
    reasoningEffort: text("reasoning_effort"),
    skillVersion: text("skill_version"),
    schemaVersion: text("schema_version"),
    providerResponseId: text("provider_response_id"),
    result: jsonb("result").$type<unknown>(),
    evidence: jsonb("evidence").$type<ReviewEvidenceSource[]>().notNull().default([]),
    attempts: jsonb("attempts").$type<ReviewAttemptRecord[]>().notNull().default([]),
    usage: jsonb("usage").$type<ReviewUsage | null>(),
    // The default is written as SQL rather than as a JavaScript `0n`, because
    // the migration snapshot is JSON and cannot serialise a BigInt.
    costNano: bigint("cost_nano", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    costCurrency: text("cost_currency"),
    costRateCardVersion: text("cost_rate_card_version"),
    costComplete: boolean("cost_complete").notNull().default(false),
    costMissingDimensions: jsonb("cost_missing_dimensions").$type<string[]>().notNull().default([]),
    onholdReason: text("onhold_reason"),
    /** What the run is doing right now, overwritten as it proceeds. */
    progress: text("progress"),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at"),
    nextRunAt: timestamp("next_run_at").defaultNow().notNull(),
    reportState: text("report_state").$type<ReviewReportState>().notNull().default("pending"),
    reportAttempts: integer("report_attempts").notNull().default(0),
    reportLastAttemptAt: timestamp("report_last_attempt_at"),
    reportError: text("report_error"),
    errorCode: text("error_code"),
    errorId: text("error_id"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Enforced by the database rather than by the enqueueing code, because two
    // concurrent enqueues both read "no active job" before either writes one.
    uniqueIndex("uidx_review_jobs_active_submission")
      .on(table.submissionId)
      .where(sql`${table.state} IN (${REVIEW_JOB_ACTIVE_STATE_SQL})`),
    index("idx_review_jobs_claim").on(table.state, table.nextRunAt),
    index("idx_review_jobs_lease").on(table.leaseExpiresAt),
    index("idx_review_jobs_submission").on(table.submissionId),
    index("idx_review_jobs_report").on(table.reportState),
    check("review_jobs_state_valid", sql`${table.state} IN (${REVIEW_JOB_STATE_SQL})`),
    check(
      "review_jobs_verdict_valid",
      sql`${table.verdict} IS NULL OR ${table.verdict} IN (${REVIEW_VERDICT_SQL})`,
    ),
    check("review_jobs_mode_valid", sql`${table.mode} IN (${REVIEW_MODE_SQL})`),
    check(
      "review_jobs_report_state_valid",
      sql`${table.reportState} IN (${REVIEW_REPORT_STATE_SQL})`,
    ),
    check("review_jobs_cost_nonnegative", sql`${table.costNano} >= 0`),
  ],
);

/**
 * Inferred select type for `review_jobs`.
 */
export type ReviewJobRow = typeof reviewJobs.$inferSelect;
/**
 * Inferred insert type for `review_jobs`.
 */
export type ReviewJobInsert = typeof reviewJobs.$inferInsert;

/**
 * Append-only audit trail for automated review runs.
 *
 * @remarks
 * Rows are never updated or deleted while their job exists, so the sequence of
 * entries reconstructs every state a job passed through. `detail` is written
 * through the redaction helper in the repository and never carries provider
 * payloads, headers or connection strings.
 */
export const reviewEvents = pgTable(
  "review_events",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => reviewJobs.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull().default(0),
    state: text("state").$type<ReviewJobState>().notNull(),
    event: text("event").notNull(),
    detail: text("detail"),
    errorId: text("error_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_review_events_job").on(table.jobId, table.id),
    check("review_events_state_valid", sql`${table.state} IN (${REVIEW_JOB_STATE_SQL})`),
  ],
);

/**
 * What every finished attempt of an automated review actually cost.
 *
 * @remarks
 * A ledger rather than a view over the jobs, and deliberately without a foreign
 * key. Money that has been spent stays spent when the suggestion it was spent
 * on is deleted, and the jobs table cascades with its submission, so a total
 * read from there understates what the provider billed. The daily ceiling reads
 * this table for the same reason.
 *
 * Rows are only ever inserted. An amount is corrected by writing a new row, so
 * the ledger can be replayed.
 */
export const reviewSpend = pgTable(
  "review_spend",
  {
    id: serial("id").primaryKey(),
    /** Job the attempt belonged to, kept as a number and not as a reference. */
    jobId: integer("job_id").notNull(),
    /** Submission the job belonged to, which may since have been deleted. */
    submissionId: integer("submission_id"),
    attempt: integer("attempt").notNull(),
    model: text("model").notNull(),
    /** `true` for probe runs, so real spend can be told apart from test spend. */
    synthetic: boolean("synthetic").notNull().default(false),
    costNano: bigint("cost_nano", { mode: "bigint" }).notNull(),
    costCurrency: text("cost_currency").notNull(),
    costRateCardVersion: text("cost_rate_card_version").notNull(),
    /** `false` when a billable dimension was missing, so the amount is a floor. */
    costComplete: boolean("cost_complete").notNull().default(true),
    spentAt: timestamp("spent_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_review_spend_day").on(table.spentAt),
    index("idx_review_spend_job").on(table.jobId),
    check("review_spend_cost_nonnegative", sql`${table.costNano} >= 0`),
  ],
);

/**
 * Inferred select type for `review_spend`.
 */
export type ReviewSpendRow = typeof reviewSpend.$inferSelect;

/**
 * Inferred select type for `review_events`.
 */
export type ReviewEventRow = typeof reviewEvents.$inferSelect;
/**
 * Inferred insert type for `review_events`.
 */
export type ReviewEventInsert = typeof reviewEvents.$inferInsert;

// ---------------------------------------------------------------------------
// Support prompts
// ---------------------------------------------------------------------------

/**
 * The short asks that appear inside the site rather than on a page of their own.
 *
 * The identifier is stable for the life of a prompt, because the counters in a
 * reader's browser are keyed by it. Renaming a prompt therefore resets nobody.
 */
export const supportPrompts = pgTable(
  "support_prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Internal, for the list in the dashboard. A visitor never sees it. */
    name: text("name").notNull(),
    /** One of the places the site renders a prompt in, which also decides its shape. */
    slot: text("slot").$type<SupportPromptSlot>().notNull(),
    /** Markdown, rendered through the same pipeline as a page. */
    content: text("content").notNull().default(""),
    buttonLabel: text("button_label").notNull().default(""),
    buttonHref: text("button_href").notNull().default("/support-me"),
    /** Where the invitation stands in the card. */
    buttonAlignment: text("button_alignment")
      .$type<SupportPromptButtonAlignment>()
      .notNull()
      .default("trailing"),
    /** From how many shops on, counted by `thresholdBasis`. */
    threshold: integer("threshold").notNull().default(3),
    /** Which of the reader's counters the threshold is measured against. */
    thresholdBasis: text("threshold_basis")
      .$type<SupportPromptThresholdBasis>()
      .notNull()
      .default("viewed"),
    /** An optional window, so a campaign switches itself on and off. */
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    /** Decides between two prompts that both qualify. Higher wins. */
    priority: integer("priority").notNull().default(0),
    /** Unpublished prompts are not delivered at all, not even to be hidden. */
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_support_prompts_slot").on(table.slot),
    check("support_prompts_threshold_nonnegative", sql`${table.threshold} >= 0`),
  ],
);

/**
 * Inferred select type for `support_prompts`.
 */
export type SupportPromptRow = typeof supportPrompts.$inferSelect;
/**
 * Inferred insert type for `support_prompts`.
 */
export type SupportPromptInsert = typeof supportPrompts.$inferInsert;

// ---------------------------------------------------------------------------
// Yearly sponsors
// ---------------------------------------------------------------------------

/**
 * The people who carry the running costs for a year.
 *
 * A sponsorship runs from the day it was paid rather than with the calendar, so
 * the list on the site is whoever paid within the last year. Nothing rolls over
 * and nothing has to be cleaned up.
 */
export const sponsors = pgTable(
  "sponsors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The given name, which the site leads with. */
    firstName: text("first_name").notNull(),
    /** The family name, empty for anybody listed under one name only. */
    lastName: text("last_name").notNull().default(""),
    /** Where they can be found, as a platform key against a profile address. */
    socialMedia: jsonb("social_media").$type<SocialMediaLinks>().notNull().default([]),
    /** A picture. Empty means none is shown. */
    imageUrl: text("image_url").notNull().default(""),
    /** Their own sentence about why they did it. */
    claim: text("claim").notNull().default(""),
    /**
     * Whether they want to be named on the site.
     *
     * What they gave counts towards the year either way. Only the name is
     * withheld, because somebody may carry the costs without wanting to be
     * seen doing it.
     */
    published: boolean("published").notNull().default(true),
    /**
     * The day they paid, which starts their year.
     *
     * What they paid is not here. A payment is a row in `donations` pointing
     * back at this sponsor, so the amount is recorded once and the ledger is
     * the only place that answers how much money came in.
     */
    paidAt: text("paid_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_sponsors_paid_at").on(table.paidAt)],
);

/**
 * What somebody said about themselves before they paid.
 *
 * A transfer carries a reference rather than a sentence, and this is what the
 * reference points at. It stands here until the money arrives and it becomes a
 * sponsor, or until it has stood long enough unclaimed to be removed.
 */
export const pendingSponsorships = pgTable(
  "pending_sponsorships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The reference the transfer carries, without its printed spaces. */
    reference: text("reference").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull().default(""),
    /**
     * The one address they gave, sorted into the service it belongs to.
     *
     * The form asks for it in a single field and works out the rest, so this is
     * the same map a sponsor carries and nothing has to be merged later.
     */
    socialMedia: jsonb("social_media").$type<SocialMediaLinks>().notNull().default([]),
    claim: text("claim").notNull().default(""),
    /**
     * What they said they would give, in cents.
     *
     * The amount is chosen on the ladder above the form and travels inside the
     * code they scan, so it is known here. It is what was announced rather than
     * what arrived: the statement decides when the entry is taken over.
     */
    amountCents: integer("amount_cents").notNull().default(0),
    /** Whether they want to be named, said in a form rather than in a payment. */
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_pending_sponsorships_created_at").on(table.createdAt)],
);

/**
 * Inferred select type for `sponsors`.
 */
export type SponsorRow = typeof sponsors.$inferSelect;
/**
 * Inferred insert type for `sponsors`.
 */
export type SponsorInsert = typeof sponsors.$inferInsert;

/**
 * Inferred select type for `pending_sponsorships`.
 */
export type PendingSponsorshipRow = typeof pendingSponsorships.$inferSelect;
/**
 * Inferred insert type for `pending_sponsorships`.
 */
export type PendingSponsorshipInsert = typeof pendingSponsorships.$inferInsert;

/**
 * Every payment that arrives, whatever route it took.
 *
 * The running costs are carried by the money rather than by the sponsorships,
 * so the figure saying what is left to fund the year has to count all of it.
 * One row per payment and one sum over them, which is what keeps a payment
 * from being counted twice or missed.
 */
export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The given name, split as a sponsor's is so both render alike. */
    firstName: text("first_name").notNull(),
    /** The family name, empty for anybody given under one name only. */
    lastName: text("last_name").notNull().default(""),
    /** Where they can be found. Usually empty: a transfer carries no address. */
    socialMedia: jsonb("social_media").$type<SocialMediaLinks>().notNull().default([]),
    /**
     * Whether they agreed to be named.
     *
     * False unless somebody said otherwise, and read by nothing today. A
     * transfer is not consent, and the answer cannot be reconstructed later.
     */
    published: boolean("published").notNull().default(false),
    /** What arrived, in cents. Never served on a public route. */
    amountCents: integer("amount_cents").notNull().default(0),
    /** The day it arrived, which decides the periods it falls into. */
    receivedAt: text("received_at").notNull(),
    /** Which route it took, as a key from `DONATION_PROVIDERS`. */
    provider: text("provider").notNull(),
    /** Anything worth keeping about this one payment, such as a reference. */
    note: text("note").notNull().default(""),
    /**
     * The sponsorship this payment paid for, or null for an ordinary donation.
     *
     * Set null rather than deleted when the sponsor goes, because the money
     * still arrived and still carried that part of the year.
     */
    sponsorId: uuid("sponsor_id").references(() => sponsors.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_donations_received_at").on(table.receivedAt),
    index("idx_donations_sponsor_id").on(table.sponsorId),
    check("donations_amount_nonnegative", sql`${table.amountCents} >= 0`),
  ],
);

/**
 * Inferred select type for `donations`.
 */
export type DonationRow = typeof donations.$inferSelect;
/**
 * Inferred insert type for `donations`.
 */
export type DonationInsert = typeof donations.$inferInsert;
