import { Hono } from "hono";
import type { AuthVariables } from "../../middleware/auth.js";
import { authRoutes } from "./auth.js";
import { categoriesRoutes } from "./categories.js";
import { contentRoutes } from "./content.js";
import { deadLinkReportsRoutes } from "./dead-link-reports.js";
import { emailTemplateRoutes } from "./email-templates.js";
import { formConfigRoutes } from "./form-config.js";
import { navAdminRoutes } from "./nav.js";
import { shopConcernReportsRoutes } from "./shop-concern-reports.js";
import { shopsRoutes } from "./shops.js";
import { statsRoutes } from "./stats.js";
import { submissionsRoutes } from "./submissions.js";
import { umamiRoutes } from "./umami.js";
import { unsplashRoutes } from "./unsplash.js";
import { usersRoutes } from "./users.js";

/**
 * Root admin route bundle mounted at `/api/admin`.
 */
export const adminRoutes = new Hono<{ Variables: AuthVariables }>();

adminRoutes.route("/", authRoutes);
adminRoutes.route("/", statsRoutes);
adminRoutes.route("/", umamiRoutes);
adminRoutes.route("/", submissionsRoutes);
adminRoutes.route("/", shopsRoutes);
adminRoutes.route("/", deadLinkReportsRoutes);
adminRoutes.route("/", shopConcernReportsRoutes);
adminRoutes.route("/", categoriesRoutes);
adminRoutes.route("/", unsplashRoutes);
adminRoutes.route("/", contentRoutes);
adminRoutes.route("/", navAdminRoutes);
adminRoutes.route("/", usersRoutes);
adminRoutes.route("/", formConfigRoutes);
adminRoutes.route("/", emailTemplateRoutes);
