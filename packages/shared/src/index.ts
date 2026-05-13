/** Domain constants and shared union types. */
export * from "./constants/domain.js";
/** App settings keys. */
export * from "./constants/settings.js";
/** Shop domain models. */
export * from "./types/shop.js";
/** Category domain models. */
export * from "./types/category.js";
/** Submission and moderation domain models. */
export * from "./types/submission.js";
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
/** Logo background color helper for shop avatars. */
export * from "./utils/logo-background.js";
/** Shared footer CSS and style-var helper for frontend and backend preview. */
export { FOOTER_STYLES_CSS, footerStyleVars, resolveFooterHeightPx } from "./footer-styles.js";
