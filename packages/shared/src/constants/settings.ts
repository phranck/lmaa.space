/**
 * Well-known app settings keys stored in the `app_settings` table.
 */
export const SETTINGS_KEYS = {
  NOTIFY_SHOP_SUBMISSION_ENABLED: "notifications.newShopSubmission.enabled",
  NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID: "notifications.newShopSubmission.templateId",
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

/** Notification-related system settings keys. */
export const SYSTEM_NOTIFICATION_SETTINGS_KEYS = [
  SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_ENABLED,
  SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID,
] as const;

/** All keys exposed to the system settings UI. */
export const SYSTEM_SETTINGS_KEYS = [...SYSTEM_NOTIFICATION_SETTINGS_KEYS] as const;
