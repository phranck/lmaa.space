import {
  SPONSORING_DEFAULTS,
  type SponsoringConfig,
  sponsoringConfigSchema,
} from "@lmaa/contracts";
import { SPONSOR_YEAR_DAYS, periodStart } from "@lmaa/shared";

import { getSetting, putSetting } from "../repositories/app-settings.js";

/** Where the costs and the threshold live in the settings table. */
const CONFIG_KEY = "sponsoring.config";

/**
 * Returns what the year costs and what it takes to be named.
 *
 * @returns The stored configuration, or the defaults when nothing is stored or
 *   what is stored can no longer be read.
 */
export async function getSponsoringConfig(): Promise<SponsoringConfig> {
  const raw = await getSetting(CONFIG_KEY);
  if (!raw) return SPONSORING_DEFAULTS;

  try {
    const parsed = sponsoringConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : SPONSORING_DEFAULTS;
  } catch {
    return SPONSORING_DEFAULTS;
  }
}

/** Stores what the year costs and what it takes to be named. */
export async function putSponsoringConfig(config: SponsoringConfig): Promise<void> {
  await putSetting(CONFIG_KEY, JSON.stringify(config));
}

/**
 * The earliest day a sponsorship may have been paid and still stand.
 *
 * @param today - The current day, as `YYYY-MM-DD`.
 * @returns A year earlier, as `YYYY-MM-DD`.
 */
export function sponsorYearStart(today: string): string {
  return periodStart(today, SPONSOR_YEAR_DAYS);
}
