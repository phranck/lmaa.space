export const REGION_CODES = ["DE", "AT", "CH", "EU"] as const;
export type RegionCode = (typeof REGION_CODES)[number];

export const ADMIN_ROLES = ["owner", "admin", "moderator"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const SUBMISSION_STATUSES = ["pending", "onhold", "approved", "rejected"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_REVIEW_STATUSES = ["approved", "rejected", "onhold"] as const;
export type SubmissionReviewStatus = (typeof SUBMISSION_REVIEW_STATUSES)[number];

export const SHOP_VISIBILITIES = ["public", "onhold", "deleted"] as const;
export type ShopVisibility = (typeof SHOP_VISIBILITIES)[number];

export const SHOP_MUTABLE_VISIBILITIES = ["public", "onhold"] as const;
export type ShopMutableVisibility = (typeof SHOP_MUTABLE_VISIBILITIES)[number];
