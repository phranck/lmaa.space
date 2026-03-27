import type { NetworkProgram } from "@lmaa/shared";

import type { NetworkClient } from "./index.js";
import { logger } from "../../lib/logger.js";

const TD_API_BASE = "https://connect.tradedoubler.com";
const REQUEST_TIMEOUT_MS = 15_000;

interface TdProgramme {
  id: number;
  name: string;
  url?: string;
  status?: string;
  commissionInfo?: string;
}

/**
 * Tradedoubler Publisher Management API client.
 * Docs: https://tradedoubler.docs.apiary.io
 *
 * Note: The Tradedoubler API documentation is sparse and partially behind JS-rendered pages.
 * This implementation is based on the documented endpoints from the Apiary docs.
 * Some endpoints may need adjustment once tested against a live account.
 */
export class TradedoublerClient implements NetworkClient {
  constructor(
    private publisherId: string,
    private token: string,
  ) {}

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await this.fetch("/publisher/programmes");
      return res.ok;
    } catch {
      return false;
    }
  }

  async searchProgrammes(query?: string): Promise<NetworkProgram[]> {
    try {
      const res = await this.fetch("/publisher/programmes");
      if (!res.ok) return [];
      const data = (await res.json()) as TdProgramme[];
      const programmes = data.map(mapTdProgramme);

      if (!query) return programmes;
      const q = query.toLowerCase();
      return programmes.filter(
        (p) =>
          p.programName.toLowerCase().includes(q) ||
          (p.programUrl?.toLowerCase().includes(q) ?? false),
      );
    } catch (err) {
      logger.error({ err }, "Tradedoubler: error fetching programmes");
      return [];
    }
  }

  async getJoinedProgrammes(): Promise<NetworkProgram[]> {
    try {
      const res = await this.fetch("/publisher/programmes?status=joined");
      if (!res.ok) return [];
      const data = (await res.json()) as TdProgramme[];
      return data.map(mapTdProgramme);
    } catch (err) {
      logger.error({ err }, "Tradedoubler: error fetching joined programmes");
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
      const res = await this.fetch(`/publisher/programmes/${programId}`);
      if (!res.ok) return null;
      const data = (await res.json()) as TdProgramme;
      return mapTdProgramme(data);
    } catch (err) {
      logger.error({ err, programId }, "Tradedoubler: failed to get programme status");
      return null;
    }
  }

  private fetch(path: string): Promise<Response> {
    return fetch(`${TD_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
}

function mapTdProgramme(p: TdProgramme): NetworkProgram {
  return {
    networkName: "tradedoubler",
    programId: String(p.id),
    programName: p.name,
    programUrl: p.url ?? null,
    applicationUrl: `https://publisher.tradedoubler.com/include/programmes/programmeInfo.html?programId=${p.id}`,
    status: mapTdStatus(p.status),
    commissionInfo: p.commissionInfo ?? null,
  };
}

function mapTdStatus(status?: string): NetworkProgram["status"] {
  switch (status?.toLowerCase()) {
    case "joined":
    case "accepted":
      return "joined";
    case "applied":
    case "pending":
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
