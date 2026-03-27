import type { NetworkProgram } from "@lmaa/shared";

import type { NetworkClient } from "./index.js";
import { logger } from "../../lib/logger.js";

const ADCELL_API_BASE = "https://www.adcell.de/api/v2";
const REQUEST_TIMEOUT_MS = 15_000;

interface AdcellProgramme {
  programId: number;
  programName: string;
  programUrl?: string;
  status?: string;
}

/**
 * Adcell Publisher API v2 client.
 *
 * Note: The Adcell API docs are behind login. This implementation uses
 * the known base URL and auth pattern (publisherId + apiPassword).
 * Endpoints may need adjustment once verified against live docs.
 */
export class AdcellClient implements NetworkClient {
  constructor(
    private publisherId: string,
    private apiPassword: string,
  ) {}

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await this.fetch("/publisher/programs");
      if (!res.ok) {
        logger.warn({ status: res.status, statusText: res.statusText }, "Adcell: credential validation failed");
      }
      return res.ok;
    } catch (err) {
      logger.error({ err }, "Adcell: credential validation error");
      return false;
    }
  }

  async searchProgrammes(query?: string): Promise<NetworkProgram[]> {
    try {
      const res = await this.fetch("/publisher/programs");
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: AdcellProgramme[] };
      const programmes = (data.items ?? []).map(mapAdcellProgramme);

      if (!query) return programmes;
      const q = query.toLowerCase();
      return programmes.filter(
        (p) =>
          p.programName.toLowerCase().includes(q) ||
          (p.programUrl?.toLowerCase().includes(q) ?? false),
      );
    } catch (err) {
      logger.error({ err }, "Adcell: error fetching programmes");
      return [];
    }
  }

  async getJoinedProgrammes(): Promise<NetworkProgram[]> {
    try {
      const res = await this.fetch("/publisher/programs?status=accepted");
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: AdcellProgramme[] };
      return (data.items ?? []).map(mapAdcellProgramme);
    } catch (err) {
      logger.error({ err }, "Adcell: error fetching joined programmes");
      return [];
    }
  }

  async matchShopToProgram(shopUrl: string): Promise<NetworkProgram | null> {
    const domain = extractDomain(shopUrl);
    if (!domain) return null;

    const programmes = await this.searchProgrammes();
    return (
      programmes.find((p) => {
        if (!p.programUrl) return false;
        const progDomain = extractDomain(p.programUrl);
        return progDomain === domain || progDomain?.endsWith(`.${domain}`) || domain.endsWith(`.${progDomain}`);
      }) ?? null
    );
  }

  async getProgrammeStatus(programId: string): Promise<NetworkProgram | null> {
    try {
      const res = await this.fetch(`/publisher/programs/${programId}`);
      if (!res.ok) return null;
      const data = (await res.json()) as AdcellProgramme;
      return mapAdcellProgramme(data);
    } catch (err) {
      logger.error({ err, programId }, "Adcell: failed to get programme status");
      return null;
    }
  }

  private fetch(path: string): Promise<Response> {
    return fetch(`${ADCELL_API_BASE}${path}`, {
      headers: {
        Authorization: `Basic ${btoa(`${this.publisherId}:${this.apiPassword}`)}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
}

function mapAdcellProgramme(p: AdcellProgramme): NetworkProgram {
  return {
    networkName: "adcell",
    programId: String(p.programId),
    programName: p.programName,
    programUrl: p.programUrl ?? null,
    applicationUrl: `https://www.adcell.de/publisher/programm/${p.programId}`,
    status: mapAdcellStatus(p.status),
    commissionInfo: null,
  };
}

function mapAdcellStatus(status?: string): NetworkProgram["status"] {
  switch (status?.toLowerCase()) {
    case "accepted":
    case "active":
      return "joined";
    case "pending":
    case "applied":
      return "applied";
    case "declined":
    case "rejected":
      return "declined";
    case "suspended":
      return "suspended";
    default:
      return "notJoined";
  }
}

function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
