import type { FormConfigPayload } from "@lmaa/contracts";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

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
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    visibility: text("visibility")
      .$type<"public" | "onhold" | "deleted">()
      .notNull()
      .default("public"),
    deletedBy: integer("deleted_by").references(() => adminUsers.id, { onDelete: "set null" }),
    deleteReason: text("delete_reason"),
    deletedWasReported: boolean("deleted_was_reported").notNull().default(false),
  },
  (table) => [index("idx_shops_active").on(table.isActive)],
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
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isOwner: boolean("is_owner").notNull().default(false),
  role: text("role").$type<"owner" | "admin" | "moderator">().notNull().default("admin"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

/**
 * Raw user shop submissions awaiting moderation.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    shopName: text("shop_name").notNull(),
    shopUrl: text("shop_url").notNull(),
    categorySuggestion: text("category_suggestion"),
    region: jsonb("region").$type<string[]>().notNull().default([]),
    pickup: text("pickup").notNull().default(""),
    shipping: text("shipping").notNull().default(""),
    description: text("description").notNull().default(""),
    submitterEmail: text("submitter_email"),
    submitterNote: text("submitter_note"),
    status: text("status")
      .$type<"pending" | "onhold" | "approved" | "rejected">()
      .notNull()
      .default("pending"),
    adminNote: text("admin_note"),
    feedbackSent: boolean("feedback_sent").notNull().default(false),
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
 * User-reported dead-link incidents grouped by shop.
 */
export const deadLinkReports = pgTable(
  "dead_link_reports",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
});

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
  config: jsonb("config").$type<FormConfigPayload>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Inferred select type for `form_configs`.
 */
export type FormConfigRow = typeof formConfigs.$inferSelect;
