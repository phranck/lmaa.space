import type { AffiliateNetworkId, NetworkMatchResult, NetworkProgram } from "@lmaa/shared";
import { SETTINGS_KEYS } from "@lmaa/shared";

import { AdcellClient } from "./adcell-client.js";
import { AwinClient } from "./awin-client.js";
import { TradedoublerClient } from "./tradedoubler-client.js";

/** Settings map as returned by `getSettings()`. */
type AppSettings = Record<string, string>;

/**
 * Common interface for affiliate network API clients.
 */
export interface NetworkClient {
  /** Test whether the stored credentials are valid. */
  validateCredentials(): Promise<boolean>;

  /** Search for available programmes (optionally filter by query). */
  searchProgrammes(query?: string): Promise<NetworkProgram[]>;

  /** Get all programmes the publisher has already joined. */
  getJoinedProgrammes(): Promise<NetworkProgram[]>;

  /** Try to match a shop URL to a programme in this network. */
  matchShopToProgram(shopUrl: string): Promise<NetworkProgram | null>;

  /** Check the current application/relationship status for a programme. */
  getProgrammeStatus(programId: string): Promise<NetworkProgram | null>;
}

/**
 * Create a network client for the given network, using credentials from app_settings.
 * Returns null if credentials are not configured.
 */
export function createNetworkClient(
  network: AffiliateNetworkId,
  settings: AppSettings,
): NetworkClient | null {
  switch (network) {
    case "awin": {
      const publisherId = settings[SETTINGS_KEYS.AWIN_PUBLISHER_ID];
      const apiToken = settings[SETTINGS_KEYS.AWIN_API_TOKEN];
      if (!publisherId || !apiToken) return null;
      return new AwinClient(publisherId, apiToken);
    }
    case "tradedoubler": {
      const publisherId = settings[SETTINGS_KEYS.TRADEDOUBLER_PUBLISHER_ID];
      const token = settings[SETTINGS_KEYS.TRADEDOUBLER_TOKEN];
      if (!publisherId || !token) return null;
      return new TradedoublerClient(publisherId, token);
    }
    case "adcell": {
      const publisherId = settings[SETTINGS_KEYS.ADCELL_PUBLISHER_ID];
      const apiPassword = settings[SETTINGS_KEYS.ADCELL_API_PASSWORD];
      if (!publisherId || !apiPassword) return null;
      return new AdcellClient(publisherId, apiPassword);
    }
    default:
      return null;
  }
}

/**
 * Match a shop to a programme using the appropriate network client.
 */
export async function matchShopToNetwork(
  shopId: number,
  shopUrl: string,
  network: AffiliateNetworkId,
  settings: AppSettings,
): Promise<NetworkMatchResult> {
  const client = createNetworkClient(network, settings);
  if (!client) {
    return { shopId, networkName: network, matched: false, program: null };
  }

  const program = await client.matchShopToProgram(shopUrl);
  return {
    shopId,
    networkName: network,
    matched: program !== null,
    program,
  };
}
