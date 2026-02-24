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
} from "drizzle-orm/pg-core";

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
  },
  (table) => [index("idx_shops_active").on(table.isActive)],
);

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
      .$type<"pending" | "approved" | "rejected">()
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

export const contentPages = pgTable("content_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ContentPage = typeof contentPages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type Shop = typeof shops.$inferSelect;
export type ShopInsert = typeof shops.$inferInsert;
export type ShopCategory = typeof shopCategories.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionInsert = typeof submissions.$inferInsert;
export type SubmissionCategory = typeof submissionCategories.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminUserInsert = typeof adminUsers.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type DeadLinkReport = typeof deadLinkReports.$inferSelect;
