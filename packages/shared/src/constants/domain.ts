/**
 * All supported region codes used across frontend forms, backend validation and filters.
 */
export const REGION_CODES = ["DE", "AT", "CH", "EU", "WORLD"] as const;

/**
 * Union type of all supported region codes.
 */
export type RegionCode = (typeof REGION_CODES)[number];

/**
 * Available admin roles in ascending order of permissions.
 */
export const ADMIN_ROLES = ["owner", "admin", "moderator"] as const;

/**
 * Union type of all admin roles.
 */
export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Allowed workflow states for incoming shop submissions.
 */
export const SUBMISSION_STATUSES = ["pending", "onhold", "approved", "rejected"] as const;

/**
 * Union type for submission workflow state.
 */
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/**
 * Allowed review outcomes when moderation is performed.
 */
export const SUBMISSION_REVIEW_STATUSES = ["approved", "rejected", "onhold", "pending"] as const;

/**
 * Union type for submission review outcomes.
 */
export type SubmissionReviewStatus = (typeof SUBMISSION_REVIEW_STATUSES)[number];

/**
 * Persisted visibility states for shops.
 */
export const SHOP_VISIBILITIES = ["public", "onhold", "deleted", "rejected"] as const;

/**
 * Union type for all persisted shop visibility states.
 */
export type ShopVisibility = (typeof SHOP_VISIBILITIES)[number];

/**
 * Visibility states that can be changed via admin UI actions.
 */
export const SHOP_MUTABLE_VISIBILITIES = ["public", "onhold", "rejected"] as const;

/**
 * Union type for mutable shop visibility states.
 */
export type ShopMutableVisibility = (typeof SHOP_MUTABLE_VISIBILITIES)[number];
