/** Domain constants and shared union types. */
export * from "./constants/domain.js";
/** Supported payment methods and input normalization. */
export * from "./constants/payment-methods.js";
/** App settings keys. */
export * from "./constants/settings.js";
/** Shop domain models. */
export * from "./types/shop.js";
/** Category domain models. */
export * from "./types/category.js";
/** Submission and moderation domain models. */
export * from "./types/submission.js";
/** Automated review job states, verdicts and automation modes. */
export * from "./constants/review-jobs.js";
/** Automated review job, usage, cost and audit models. */
export * from "./types/review-job.js";
/** Admin/auth domain models. */
export * from "./types/admin.js";
/** Generic API envelope and pagination models. */
export * from "./types/api.js";
/** CMS/content and navigation models. */
export * from "./types/content.js";
/** Media library domain models. */
export * from "./types/media.js";
/** Unsplash image metadata models. */
export * from "./types/unsplash.js";
/** API error parsing and normalization helpers. */
export * from "./utils/api-error.js";
/** Social media validation and normalization. */
export * from "./utils/social-media.js";
/** Rejection token generation for public rejection pages. */
export * from "./utils/rejection-token.js";
/** Shop ID encoding/decoding for public URLs. */
export * from "./utils/shop-token.js";
/** User-friendly token expansion (`U+XXXX`, `{nbhy}`, `&#8209;`) for plain-text fields. */
export * from "./utils/text-tokens.js";
/** The ISO 11649 creditor reference a transfer carries instead of a sentence. */
export * from "./utils/creditor-reference.js";
/** How long a sponsorship stands and how much of it is left. */
export * from "./utils/sponsor-year.js";
/** Given name and family name joined into one display name. */
export * from "./utils/person-name.js";
/** Logo background color helper for shop avatars. */
export * from "./utils/logo-background.js";

export * from "./utils/epc-qr.js";
/** Markdown shortcode registry metadata and parser helpers. */
export * from "./markdown-shortcodes.js";
export * from "./utils/markdown-shortcode-parser.js";
/** Shared footer CSS and style-var helper for frontend and backend preview. */
export { FOOTER_STYLES_CSS, footerStyleVars, resolveFooterHeightPx } from "./footer-styles.js";
