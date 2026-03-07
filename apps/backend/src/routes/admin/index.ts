import { Hono } from "hono";

import { authRoutes } from "./auth.js";
import { categoriesRoutes } from "./categories.js";
import { contentRoutes } from "./content.js";
import { deadLinkReportsRoutes } from "./dead-link-reports.js";
import { emailTemplateRoutes } from "./email-templates.js";
import { footerConfigRoutes } from "./footer-config.js";
import { formConfigRoutes } from "./form-config.js";
import { navAdminRoutes } from "./nav.js";
import { shopConcernReportsRoutes } from "./shop-concern-reports.js";
import { shopsRoutes } from "./shops.js";
import { statsRoutes } from "./stats.js";
import { submissionsRoutes } from "./submissions.js";
import { umamiRoutes } from "./umami.js";
import { unsplashRoutes } from "./unsplash.js";
import { usersRoutes } from "./users.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";

/**
 * Root admin route bundle mounted at `/api/admin`.
 *
 * Auth routes (setup, login) are mounted directly so they remain public.
 * All other routes go through a sub-router with group-level `requireAuth`.
 */
export const adminRoutes = new Hono<{ Variables: AuthVariables }>();

// Auth routes handle their own auth (setup/login = public, logout/me = requireAuth inline)
adminRoutes.route("/", authRoutes);

// All other admin routes require authentication at the group level
const protectedRoutes = new Hono<{ Variables: AuthVariables }>();
protectedRoutes.use("*", requireAuth);
protectedRoutes.route("/", statsRoutes);
protectedRoutes.route("/", umamiRoutes);
protectedRoutes.route("/", submissionsRoutes);
protectedRoutes.route("/", shopsRoutes);
protectedRoutes.route("/", deadLinkReportsRoutes);
protectedRoutes.route("/", shopConcernReportsRoutes);
protectedRoutes.route("/", categoriesRoutes);
protectedRoutes.route("/", unsplashRoutes);
protectedRoutes.route("/", contentRoutes);
protectedRoutes.route("/", navAdminRoutes);
protectedRoutes.route("/", usersRoutes);
protectedRoutes.route("/", formConfigRoutes);
protectedRoutes.route("/", emailTemplateRoutes);
protectedRoutes.route("/", footerConfigRoutes);

adminRoutes.route("/", protectedRoutes);
