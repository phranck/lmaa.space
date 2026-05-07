import { PLATFORM_MAP, type PlatformDef } from "@lmaa/ui";

/** Service keys that have a working backend implementation in this dashboard. */
export type ServiceId = "mastodon";

/** Ordered list of currently-supported services. Add new entries as backends ship. */
export const SUPPORTED_SERVICE_KEYS: readonly ServiceId[] = ["mastodon"] as const;

/** PlatformDef entries for the supported services, in `SUPPORTED_SERVICE_KEYS` order. */
export const SUPPORTED_PLATFORMS: PlatformDef[] = SUPPORTED_SERVICE_KEYS
  .map((key) => PLATFORM_MAP.get(key))
  .filter((p): p is PlatformDef => p !== undefined);
